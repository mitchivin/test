/*
  about.js — About App Interactivity for Windows XP Simulation
  Handles interactivity for the About Me app, including dynamic content
  loading from info.json, and expand/collapse logic for left panel cards.
  @file src/apps/about/about.js
*/

/**
 * Prepends the necessary path to asset URLs to ensure they load correctly
 * when the About app is displayed within an iframe in the main shell.
 * If the path is already absolute (http/https) or correctly relative for the iframe context,
 * it's returned unchanged. Otherwise, it's prefixed with '../../../'.
 * @param {string} path - The original asset path.
 * @returns {string} The transformed asset path.
 */
function transformAssetPath(path) {
  if (!path) return path;
  if (
    path.startsWith("http:") ||
    path.startsWith("https:") ||
    path.startsWith("../../../")
  ) {
    return path;
  }
  let newPath = path;
  if (newPath.startsWith("/")) {
    newPath = newPath.substring(1);
  }
  if (newPath.startsWith("assets/")) {
    return "../../../" + newPath;
  }
  return newPath;
}

document.addEventListener("DOMContentLoaded", async () => {
  // ----- Element Selections ----- //
  const socialLinksCard = document.getElementById("social-links-card");
  const skillsCard = document.getElementById("skills-card");
  const softwareCard = document.getElementById("software-card");

  const leftPanel = document.querySelector(".left-panel");
  if (!leftPanel) {
    console.error("Left panel not found");
    return;
  }

  // ----- Fetch and Process info.json ----- //
  // All dynamic content for the About app (socials, paragraphs, skills, software) is sourced from info.json.
  let info = null;
  try {
    const response = await fetch("../../../info.json");
    info = await response.json();
  } catch (e) {
    console.error("Failed to load info.json", e);
    return;
  }
  if (!info) return;

  // ----- Render Social Links ----- //
  // Dynamically populates the social links card using data from info.json.
  // Only shows links where 'showInAbout' is true.
  if (socialLinksCard && info.socials) {
    const socialLinksContent = socialLinksCard.querySelector(
      ".left-panel__card__content-inner",
    );
    if (socialLinksContent) {
      socialLinksContent.innerHTML = ""; // Clear existing
      info.socials.forEach((social) => {
        if (social.showInAbout) {
          // Check the flag
          const linkElement = document.createElement("a");
          linkElement.href = social.url;
          linkElement.target = "_blank";
          linkElement.rel = "noopener noreferrer";
          linkElement.className = "left-panel__card__row social-link"; // Add social-link class for styling if needed

          const img = document.createElement("img");
          img.className = "left-panel__card__img";
          // Use transformAssetPath for social icons, assuming they might be relative
          img.src = transformAssetPath(social.icon);
          img.alt = social.name;

          const span = document.createElement("span");
          span.className = "left-panel__card__text";
          span.textContent = social.name;

          linkElement.appendChild(img);
          linkElement.appendChild(span);
          socialLinksContent.appendChild(linkElement);

          // Special handling for Instagram:
          // If the link is for Instagram (identified by key: "instagram" in info.json),
          // clicking it will post a message to the parent window (main shell)
          // to handle the navigation, rather than opening directly in the iframe.
          if (social.key === "instagram") {
            linkElement.addEventListener("click", function (e) {
              e.preventDefault();
              if (window.parent && window.parent !== window) {
                window.parent.postMessage(
                  { type: "open-instagram-from-about" },
                  "*",
                );
              }
            });
          }
        }
      });
    }
  }

  // ----- Render About Me Paragraphs and Icons ----- //
  // Dynamically populates the main content area with paragraphs and associated icons from info.json.
  if (info.about) {
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
        icon.alt = `Paragraph icon ${i + 1}`;
        icon.src = transformAssetPath(info.about[`p${i + 1}`]);
        iconCol.appendChild(icon);
        const textSpan = document.createElement("span");
        textSpan.className = "about-paragraph-text";
        textSpan.textContent = text;
        row.appendChild(iconCol);
        row.appendChild(textSpan);
        sectionText.appendChild(row);
      });
    }

    // ----- Render Skills ----- //
    // Dynamically populates the skills card with skills and their icons from info.json.
    if (skillsCard && info.about.skills && info.about.skillsIcons) {
      const skillsContent = skillsCard.querySelector(
        ".left-panel__card__content-inner",
      );
      if (skillsContent) {
        skillsContent.innerHTML = "";
        info.about.skills.forEach((skill, i) => {
          const row = document.createElement("div");
          row.className = "left-panel__card__row";
          const img = document.createElement("img");
          img.className = "left-panel__card__img";
          img.alt = skill;
          img.src = transformAssetPath(info.about.skillsIcons[i] || "");
          const span = document.createElement("span");
          span.className = "left-panel__card__text";
          span.textContent = skill;
          row.appendChild(img);
          row.appendChild(span);
          skillsContent.appendChild(row);
        });
      }
    }

    // ----- Render Software ----- //
    // Dynamically populates the software card with software items and their icons from info.json.
    if (softwareCard && info.about.software && info.about.softwareIcons) {
      const softwareContent = softwareCard.querySelector(
        ".left-panel__card__content-inner",
      );
      if (softwareContent) {
        softwareContent.innerHTML = "";
        info.about.software.forEach((softwareItem, i) => {
          // Renamed to avoid conflict
          const row = document.createElement("div");
          row.className = "left-panel__card__row";
          const img = document.createElement("img");
          img.className = "left-panel__card__img";
          img.alt = softwareItem;
          img.src = transformAssetPath(info.about.softwareIcons[i] || "");
          const span = document.createElement("span");
          span.className = "left-panel__card__text";
          span.textContent = softwareItem;
          row.appendChild(img);
          row.appendChild(span);
          softwareContent.appendChild(row);
        });
      }
    }
  }

  // ----- Initialize Default Card States ----- //
  // By default, all cards (Social, Skills, Software) are expanded on load.
  if (socialLinksCard) {
    expandCard(socialLinksCard);
  }
  if (skillsCard) {
    expandCard(skillsCard);
  }
  if (softwareCard) {
    expandCard(softwareCard);
  }

  // ----- Attach Card Toggle Event Listeners ----- //
  // Adds click listeners to card headers to toggle their expanded/collapsed state.
  if (socialLinksCard) {
    const socialHeader = socialLinksCard.querySelector(
      ".left-panel__card__header",
    );
    if (socialHeader) {
      socialHeader.addEventListener("click", () => toggleCard(socialLinksCard));
    }
  }

  // Handle click events on Skills card header
  if (skillsCard) {
    const skillsHeader = skillsCard.querySelector(".left-panel__card__header");
    if (skillsHeader) {
      skillsHeader.addEventListener("click", () => toggleCard(skillsCard));
    }
  }

  // Handle click events on Software card header
  if (softwareCard) {
    const softwareHeader = softwareCard.querySelector(
      ".left-panel__card__header",
    );
    if (softwareHeader) {
      softwareHeader.addEventListener("click", () => toggleCard(softwareCard));
    }
  }
});

// ----- Global Event Listeners for UX Enhancements ----- //

// Notify parent window of any interaction within the iframe.
// This can be used by the shell to manage focus or other iframe-related behaviors.
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

// ----- Helper Functions for Card Collapse/Expand ----- //

/**
 * Expands a given card element.
 * Removes the 'collapsed' class and updates the header icon to the 'pull-up' state.
 * Differentiates icon source for the 'social' card variant.
 * @param {HTMLElement} cardElement - The card element to expand.
 */
function expandCard(cardElement) {
  if (!cardElement) return;
  cardElement.classList.remove("collapsed");
  const icon = cardElement.querySelector(".left-panel__card__header__img");
  if (icon) {
    if (cardElement.classList.contains("left-panel__card--social")) {
      icon.src = "../../../assets/apps/about/pullup-alt.webp";
    } else {
      icon.src = "../../../assets/apps/about/pullup.webp";
    }
  }
}

/**
 * Toggles the collapsed/expanded state of a given card element.
 * Adds or removes the 'collapsed' class and updates the header icon
 * (pull-down for collapsed, pull-up for expanded).
 * Differentiates icon source for the 'social' card variant.
 * @param {HTMLElement} cardElement - The card element to toggle.
 */
function toggleCard(cardElement) {
  if (!cardElement) return;
  cardElement.classList.toggle("collapsed");
  const isCollapsed = cardElement.classList.contains("collapsed");
  const icon = cardElement.querySelector(".left-panel__card__header__img");
  if (icon) {
    if (cardElement.classList.contains("left-panel__card--social")) {
      icon.src = isCollapsed
        ? "../../../assets/apps/about/pulldown-alt.webp"
        : "../../../assets/apps/about/pullup-alt.webp";
    } else {
      icon.src = isCollapsed
        ? "../../../assets/apps/about/pulldown.webp"
        : "../../../assets/apps/about/pullup.webp";
    }
  }
}
