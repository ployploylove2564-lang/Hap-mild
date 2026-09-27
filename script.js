const photos = [
  "825260998_1049321621475742_5982110051867212371_n.jpg",
  "825261055_1753340372638165_2149030772489900535_n.jpg",
  "825261084_1096861216669881_6749566047829010865_n.jpg",
  "825261451_1340654371279780_6044351614909153725_n.jpg",
  "825261466_1782776663049250_3935942504273394361_n.jpg",
  "825261479_962267762912371_6776678561243309847_n.jpg",
  "825261482_2134697087127097_2279144631896923438_n.jpg",
  "825310085_2382409809178149_2092869361139682197_n.jpg",
  "825310389_2188765205354352_3732248483774671032_n.png",
  "825310389_996371940141912_4337802094567843933_n.jpg",
  "825310408_910588648582445_2155819737727961279_n.jpg",
  "825310415_1408937961307373_3150945006347010280_n.jpg",
  "825310510_1791430448781583_7738635703159296835_n.jpg",
  "825311111_28412017611758289_4091793978037301091_n.jpg",
  "825311123_3054296254918393_8296621093232620261_n.jpg",
  "825311129_1079925188159774_7305040552368772741_n.jpg",
  "825311172_2181190802821871_2233712144735324922_n.jpg",
  "825311175_2333623910530488_2769093251527833318_n.jpg",
  "825311266_1087125903864228_6352001931540802137_n.jpg",
  "825311267_28673072062329791_6866006693679367629_n.jpg",
  "825311273_2131944891020521_3835004681686816558_n.jpg",
  "825311280_1069146759350752_3567363969831244382_n.jpg",
  "825311340_1364629905659223_8737395419144496583_n.jpg",
  "825311352_1705617481466164_2129082073676703732_n.jpg",
  "825312435_3942793109190824_137309310741785215_n.jpg",
  "825312540_1101095795700078_2237371087131140956_n.jpg",
  "825312572_2258328674944976_8198417204625111262_n.jpg",
  "826014137_1434168055332632_8799179640086851196_n.jpg",
];

const PHOTOS_PER_PAGE = 4;
const totalPages = Math.ceil(photos.length / PHOTOS_PER_PAGE);
const totalSpreads = Math.ceil(totalPages / 2);

// Duration must match the CSS `animation-duration` on .turn-sheet / .turn-face
// (page-turn-forward/backward, page-front-shade/back-shade) - it's only used
// here as a safety-net timeout in case the animationend event never fires.
const TURN_DURATION_MS = 720;

const book = document.querySelector("#book");
const spreadPicker = document.querySelector("#spread-picker");
const previousButton = document.querySelector("#previous-button");
const nextButton = document.querySelector("#next-button");
const previousLabel = document.querySelector("#previous-label");
const nextLabel = document.querySelector("#next-label");
const progressTrack = document.querySelector("#progress-track");
const progressFill = document.querySelector("#progress-fill");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxCaption = document.querySelector("#lightbox-caption");
const lightboxClose = document.querySelector("#lightbox-close");

let currentSpread = 0;
let lastFocusedPhoto = null;
let turnInProgress = false;

function createPhotoCard(filename, index) {
  const caption = `ภาพบันทึกความทรงจำ ${String(index + 1).padStart(2, "0")}`;
  return `
    <button class="photo-card" type="button" data-photo-index="${index}" aria-label="เปิดภาพลำดับที่ ${index + 1}">
      <span class="photo-frame">
        <img src="${filename}" alt="${caption}" loading="lazy" decoding="async">
        <span class="photo-zoom" aria-hidden="true">⤢</span>
      </span>
    </button>
  `;
}

function createPage(pageIndex, side) {
  const start = pageIndex * PHOTOS_PER_PAGE;
  const pagePhotos = photos.slice(start, start + PHOTOS_PER_PAGE);
  const pageNumber = pageIndex + 1;
  const photoGrid = pagePhotos.map((filename, offset) =>
    createPhotoCard(filename, start + offset),
  ).join("");

  return `
    <article class="page page-${side}" aria-label="หน้า ${pageNumber}">
      <div class="photo-grid">${photoGrid}</div>
    </article>
  `;
}

function renderSpread() {
  const firstPageIndex = currentSpread * 2;
  const pages = [firstPageIndex, firstPageIndex + 1]
    .filter((pageIndex) => pageIndex < totalPages);

  book.innerHTML = pages.map((pageIndex, index) =>
    createPage(pageIndex, index === 0 ? "left" : "right"),
  ).join("");

  previousButton.disabled = currentSpread === 0;
  previousLabel.disabled = currentSpread === 0;
  nextButton.disabled = currentSpread === totalSpreads - 1;
  nextLabel.disabled = currentSpread === totalSpreads - 1;
  const safeSpreadCount = Math.max(totalSpreads, 1);
  progressTrack.setAttribute("aria-valuemax", String(totalSpreads));
  progressTrack.setAttribute("aria-valuenow", String(currentSpread + 1));
  progressFill.style.width = `${((currentSpread + 1) / safeSpreadCount) * 100}%`;

  spreadPicker.innerHTML = Array.from({ length: totalSpreads }, (_, index) => `
    <button
      class="spread-dot${index === currentSpread ? " is-active" : ""}"
      type="button"
      aria-label="ไปยังคู่หน้าที่ ${index + 1}"
      aria-current="${index === currentSpread ? "page" : "false"}"
      data-spread="${index}"
    ></button>
  `).join("");

}

function animatePageTurn(direction, nextSpread) {
  turnInProgress = true;
  book.setAttribute("aria-busy", "true");

  const finishWithoutTurn = () => {
    currentSpread = nextSpread;
    renderSpread();
    turnInProgress = false;
    book.removeAttribute("aria-busy");
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    finishWithoutTurn();
    return;
  }

  if (window.matchMedia("(max-width: 760px)").matches) {
    currentSpread = nextSpread;
    renderSpread();
    const pages = [...book.querySelectorAll(".page")];
    pages.forEach((page, index) => {
      page.classList.add("page-entering");
      page.inert = true;
      if (index > 0) page.style.animationDelay = `${index * 65}ms`;
    });
    window.setTimeout(() => {
      pages.forEach((page) => {
        page.classList.remove("page-entering");
        page.style.removeProperty("animation-delay");
        page.inert = false;
      });
      turnInProgress = false;
      book.removeAttribute("aria-busy");
    }, 700);
    return;
  }

  const forward = direction === "next";
  const outgoingPage = book.querySelector(forward ? ".page-right" : ".page-left");
  if (!outgoingPage) {
    finishWithoutTurn();
    return;
  }
  book.querySelectorAll(".page").forEach((page) => {
    page.inert = true;
  });

  const incomingPageIndex = nextSpread * 2 + (forward ? 0 : 1);
  const revealPageIndex = nextSpread * 2 + (forward ? 1 : 0);
  const incomingPage = createPageElement(incomingPageIndex, forward ? "left" : "right");
  const revealPage = revealPageIndex < totalPages
    ? createPageElement(revealPageIndex, forward ? "right" : "left")
    : createBlankPage();

  const reveal = document.createElement("div");
  reveal.className = `turn-reveal turn-reveal--${direction}`;
  reveal.setAttribute("aria-hidden", "true");
  reveal.inert = true;
  reveal.append(revealPage);

  const sheet = document.createElement("div");
  sheet.className = `turn-sheet turn-sheet--${direction}`;
  sheet.setAttribute("aria-hidden", "true");
  sheet.inert = true;

  const front = document.createElement("div");
  front.className = "turn-face turn-face--front";
  front.append(outgoingPage.cloneNode(true));

  const back = document.createElement("div");
  back.className = "turn-face turn-face--back";
  back.append(incomingPage);

  sheet.append(front, back);
  book.append(reveal);
  book.append(sheet);

  let settled = false;
  const finishTurn = () => {
    if (settled) return;
    settled = true;
    sheet.remove();
    currentSpread = nextSpread;
    renderSpread();
    turnInProgress = false;
    book.removeAttribute("aria-busy");
  };

  const finishOnSheet = (event) => {
    if (event.target === sheet) finishTurn();
  };
  sheet.addEventListener("animationend", finishOnSheet);
  sheet.addEventListener("animationcancel", finishOnSheet);
  window.setTimeout(finishTurn, TURN_DURATION_MS + 150);
}

function createPageElement(pageIndex, side) {
  const template = document.createElement("template");
  template.innerHTML = createPage(pageIndex, side).trim();
  return template.content.firstElementChild;
}

function createBlankPage() {
  const page = document.createElement("article");
  page.className = "page page-blank";
  page.setAttribute("aria-hidden", "true");
  return page;
}

function turnPage(direction) {
  if (turnInProgress) return;
  const nextSpread = currentSpread + direction;
  if (nextSpread < 0 || nextSpread >= totalSpreads) return;
  const turnDirection = direction > 0 ? "next" : "previous";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    currentSpread = nextSpread;
    renderSpread();
    return;
  }
  animatePageTurn(turnDirection, nextSpread);
}

function openLightbox(index, trigger) {
  const filename = photos[index];
  if (!filename) return;

  lastFocusedPhoto = trigger;
  lightboxImage.src = filename;
  lightboxImage.alt = `ภาพบันทึกความทรงจำ ${String(index + 1).padStart(2, "0")}`;
  lightboxCaption.textContent = "";
  lightbox.showModal();
  lightboxClose.focus();
}

book.addEventListener("click", (event) => {
  const photoButton = event.target.closest(".photo-card");
  if (!photoButton) return;
  openLightbox(Number(photoButton.dataset.photoIndex), photoButton);
});

spreadPicker.addEventListener("click", (event) => {
  const spreadButton = event.target.closest("[data-spread]");
  if (!spreadButton || turnInProgress) return;
  const nextSpread = Number(spreadButton.dataset.spread);
  if (nextSpread === currentSpread) return;
  if (Math.abs(nextSpread - currentSpread) === 1) {
    const direction = nextSpread > currentSpread ? "next" : "previous";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      currentSpread = nextSpread;
      renderSpread();
    } else {
      animatePageTurn(direction, nextSpread);
    }
    return;
  }
  currentSpread = nextSpread;
  renderSpread();
});

previousButton.addEventListener("click", () => turnPage(-1));
previousLabel.addEventListener("click", () => turnPage(-1));
nextButton.addEventListener("click", () => turnPage(1));
nextLabel.addEventListener("click", () => turnPage(1));
lightboxClose.addEventListener("click", () => lightbox.close());

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) lightbox.close();
});

lightbox.addEventListener("close", () => {
  if (lastFocusedPhoto?.isConnected) lastFocusedPhoto.focus();
});

document.addEventListener("keydown", (event) => {
  if (lightbox.open || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    turnPage(-1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    turnPage(1);
  }
});

renderSpread();