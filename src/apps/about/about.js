// ==================================================
//  about.js — About App Interactivity for Windows XP Simulation
//  Handles expand/collapse logic for left panel cards in the About Me app.
// ==================================================
/**
 * @file about.js
 */

/**
 * Initialize listeners for card collapse/expand on DOMContentLoaded.
 */
document.addEventListener("DOMContentLoaded", async () => {
  document
    .querySelectorAll(".left-panel__card__header__img")
    .forEach((icon) => {
      icon.addEventListener("click", function (e) {
        e.stopPropagation();
        const card = this.closest(".left-panel__card");
        card.classList.toggle("collapsed");
        const isCollapsed = card.classList.contains("collapsed");
        if (card.classList.contains("left-panel__card--social")) {
          this.src = isCollapsed
            ? "../../../assets/apps/about/pulldown-alt.webp"
            : "../../../assets/apps/about/pullup-alt.webp";
        } else {
          this.src = isCollapsed
            ? "../../../assets/apps/about/pulldown.webp"
            : "../../../assets/apps/about/pullup.webp";
        }
      });
    });

  // Fetch info.json
  let info = null;
  try {
    const response = await fetch("/info.json");
    info = await response.json();
  } catch (e) {
    console.error("Failed to load info.json", e);
    return;
  }
  if (!info || !info.about) return;

  // Render About Me paragraphs and icons
  const sectionText = document.querySelector(".section_text");
  if (sectionText) {
    sectionText.innerHTML = "";
    info.about.paragraphs.forEach((text, i) => {
      const row = document.createElement("div");
      row.className = "about-paragraph-row";
      const iconCol = document.createElement("span");
      iconCol.className = "about-paragraph-icon-col";
      const icon = document.createElement("img");
      icon.className = "about-paragraph-icon";
      icon.draggable = false;
      icon.alt = `Paragraph icon ${i+1}`;
      icon.src = info.about[`p${i+1}`];
      iconCol.appendChild(icon);
      const textSpan = document.createElement("span");
      textSpan.className = "about-paragraph-text";
      textSpan.textContent = text;
      row.appendChild(iconCol);
      row.appendChild(textSpan);
      sectionText.appendChild(row);
    });
  }

  // Render Skills
  const skillsCard = document.querySelectorAll(".left-panel__card")[1];
  if (skillsCard) {
    const skillsContent = skillsCard.querySelector(".left-panel__card__content-inner");
    if (skillsContent) {
      skillsContent.innerHTML = "";
      info.about.skills.forEach((skill, i) => {
        const row = document.createElement("div");
        row.className = "left-panel__card__row";
        const img = document.createElement("img");
        img.className = "left-panel__card__img";
        img.alt = skill;
        img.src = info.about.skillsIcons[i] || "";
        const span = document.createElement("span");
        span.className = "left-panel__card__text";
        span.textContent = skill;
        row.appendChild(img);
        row.appendChild(span);
        skillsContent.appendChild(row);
      });
    }
  }

  // Render Software
  const softwareCard = document.querySelectorAll(".left-panel__card")[2];
  if (softwareCard) {
    const softwareContent = softwareCard.querySelector(".left-panel__card__content-inner");
    if (softwareContent) {
      softwareContent.innerHTML = "";
      info.about.software.forEach((software, i) => {
        const row = document.createElement("div");
        row.className = "left-panel__card__row";
        const img = document.createElement("img");
        img.className = "left-panel__card__img";
        img.alt = software;
        img.src = info.about.softwareIcons[i] || "";
        const span = document.createElement("span");
        span.className = "left-panel__card__text";
        span.textContent = software;
        row.appendChild(img);
        row.appendChild(span);
        softwareContent.appendChild(row);
      });
    }
  }

  // Render Social Links
  const socialCard = document.querySelector('.left-panel__card--social');
  if (socialCard && info.socials) {
    const socialContent = socialCard.querySelector('.left-panel__card__content-inner');
    if (socialContent) {
      socialContent.innerHTML = "";
      info.socials.forEach(social => {
        const row = document.createElement("div");
        row.className = "left-panel__card__row social-link";
        const img = document.createElement("img");
        img.className = "left-panel__card__img";
        img.src = social.icon;
        img.alt = social.name;
        const a = document.createElement("a");
        a.href = social.url;
        a.target = "_blank";
        a.rel = "noreferrer";
        a.className = "left-panel__card__text link";
        a.textContent = social.name;
        row.appendChild(img);
        row.appendChild(a);
        socialContent.appendChild(row);
        // Special handling for Instagram (by key)
        if (social.key === "instagram") {
          a.addEventListener("click", function (e) {
            e.preventDefault();
            if (window.parent && window.parent !== window) {
              window.parent.postMessage({ type: "open-instagram-from-about" }, "*");
            }
          });
        }
      });
    }
  }
});

document.addEventListener("click", () => {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "iframe-interaction" }, "*");
  }
});

// Prevent pinch-zoom and multi-touch gestures for consistent UX
["gesturestart", "gesturechange", "gestureend"].forEach((evt) => {
  document.addEventListener(evt, (e) => e.preventDefault(), { passive: false });
});
document.addEventListener(
  "touchstart",
  (e) => {
    if (e.touches.length > 1) e.preventDefault();
  },
  { passive: false },
);
document.addEventListener(
  "touchmove",
  (e) => {
    if (e.touches.length > 1) e.preventDefault();
  },
  { passive: false },
);
let lastTouchEnd = 0;
document.addEventListener(
  "touchend",
  (event) => {
    const now = new Date().getTime();
    if (now - lastTouchEnd <= 300) event.preventDefault();
    lastTouchEnd = now;
  },
  { passive: false },
);
document.addEventListener(
  "wheel",
  (event) => {
    if (
      event.ctrlKey ||
      event.target === document.body ||
      event.target === document.documentElement
    ) {
      event.preventDefault();
    }
  },
  { passive: false },
);
