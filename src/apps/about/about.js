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
document.addEventListener("DOMContentLoaded", () => {
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

  // Intercept Instagram link click to notify parent shell
  const instagramLink = document.querySelector(
    '.social-link a[href*="instagram.com"]',
  );
  if (instagramLink) {
    instagramLink.addEventListener("click", function (e) {
      e.preventDefault();
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "open-instagram-from-about" }, "*");
      }
    });
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
