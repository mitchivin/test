// ==================================================
//  projects.js — Projects App Interactivity for Windows XP Simulation
//  Handles lightbox, masonry layout, and interactivity for the My Projects app.
// ==================================================
/**
 * Handles lightbox, masonry layout, and interactivity for the My Projects app.
 * Loaded as an iframe in the main shell.
 * @file projects.js
 */

// ===== Global State & Utility Functions =====
// Global state for persistent description visibility
let userPrefersDescriptionVisible = false;

// --- Global mute preference for lightbox videos ---
let userPrefersMuted = true; // Default: videos start muted
if (
  isDesktop() &&
  window.sessionStorage &&
  sessionStorage.getItem("projectsUserPrefersMuted") !== null
) {
  userPrefersMuted =
    sessionStorage.getItem("projectsUserPrefersMuted") === "true";
}

// === Constants ===
const MIN_SWIPE_DISTANCE = 44; // Minimum px for swipe to trigger navigation

// Utility function to check if the current view is desktop-like
function isDesktop() {
  return window.matchMedia("(min-width: 768px)").matches;
}

// Utility function to check if the device is a touchscreen
function isTouchDevice() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

// Utility functions
function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function sendMessageToParent(payload) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(payload, "*");
  }
}

// ===== Description Card Creation =====

/**
 * Creates the desktop description card for the lightbox.
 * @param {string} titleText - The project title
 * @param {string} descriptionText - The project description
 * @param {string} [bulletPointsText] - Optional pipe-separated string of bullet points
 * @param {string} [toolsUsedText] - Optional comma-separated string of tools used
 * @returns {HTMLElement} The animated wrapper containing the card
 */
function createDesktopDescriptionCard(
  titleText,
  descriptionText,
  bulletPointsText,
  toolsUsedText,
) {
  const animWrapper = createEl("div", "desc-card-anim-wrapper");
  const descCard = createEl("div", "lightbox-desc-card");
  clearChildren(descCard);

  const mainContentContainer = createEl("div", "card-main-content");

  // Add the new "PROJECT" label
  const projectLabelEl = createEl(
    "div",
    "card-project-label",
    "PERSONAL PROJECT",
  );
  mainContentContainer.appendChild(projectLabelEl);

  if (titleText) {
    const titleEl = createEl("div", "card-title", titleText);
    mainContentContainer.appendChild(titleEl);

    // Add HR divider below title
    const divider = createEl("hr", "card-title-divider");
    mainContentContainer.appendChild(divider);
  }

  // Add the new "DESCRIPTION" label
  const descriptionLabelEl = createEl(
    "div",
    "card-description-label",
    "DESCRIPTION",
  );
  mainContentContainer.appendChild(descriptionLabelEl);

  if (descriptionText) {
    const bodyEl = createEl("div", "card-body", descriptionText);
    mainContentContainer.appendChild(bodyEl);
  }

  if (bulletPointsText && bulletPointsText.trim() !== "") {
    const bulletPointsContainer = createEl("div", "card-bullet-points");
    const ul = createEl("ul");
    bulletPointsText.split("|").forEach((pointText) => {
      if (pointText.trim()) {
        const li = createEl("li", null, pointText.trim());
        ul.appendChild(li);
      }
    });
    bulletPointsContainer.appendChild(ul);
    mainContentContainer.appendChild(bulletPointsContainer);
  }

  descCard.appendChild(mainContentContainer);

  // Add TOOLS USED section (will be wrapped and positioned at the bottom by CSS)
  if (toolsUsedText && toolsUsedText.trim() !== "") {
    const toolsUsedContainer = createEl("div", "card-tools-section");

    // NEW: Add a divider INSIDE and AT THE TOP of the "TOOLS USED" section
    const toolsDivider = createEl("hr", "card-title-divider");
    toolsUsedContainer.appendChild(toolsDivider); // Divider is now first child of toolsUsedContainer

    const toolsLabelEl = createEl("div", "card-tools-label", "TOOLS USED");
    toolsUsedContainer.appendChild(toolsLabelEl);

    const toolsListEl = createEl("div", "card-tools-list");
    const toolsArray = toolsUsedText.split(",").map((tool) => {
      const trimmedTool = tool.trim();
      if (trimmedTool.length > 0) {
        return trimmedTool.charAt(0).toUpperCase() + trimmedTool.slice(1);
      }
      return trimmedTool;
    });
    toolsListEl.textContent = toolsArray.join(", ");
    toolsUsedContainer.appendChild(toolsListEl);
    descCard.appendChild(toolsUsedContainer);
  }

  animWrapper.appendChild(descCard);
  return animWrapper;
}

function createSpinnerOverlay() {
  const overlay = document.createElement("div");
  overlay.className = "video-spinner-overlay";
  overlay.innerHTML = '<div class="video-spinner"></div>';
  return overlay;
}

function createMuteIconOverlay(isMuted) {
  const overlay = document.createElement("div");
  overlay.className = "mute-icon-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `<img src="../../../assets/apps/projects/icons/${isMuted ? "voldown" : "volup"}.webp" alt="${isMuted ? "Muted" : "Unmuted"}" draggable="false" style="width:100%;height:100%;object-fit:contain;" />`;
  return overlay;
}

function showMuteIconOverlay(videoElement, isMuted) {
  // Remove any existing overlay
  const existing =
    videoElement.parentElement.querySelector(".mute-icon-overlay");
  if (existing) existing.remove();
  const overlay = createMuteIconOverlay(isMuted);
  videoElement.parentElement.appendChild(overlay);
  // Only fade in if video is ready (poster is gone)
  if (videoElement.readyState >= 3 && !videoElement.paused) {
    // Force reflow for animation
    void overlay.offsetWidth;
    overlay.classList.add("show");
    setTimeout(() => {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 1800);
    }, 1800);
  } else {
    // Wait for 'playing' event before showing overlay
    const onPlay = () => {
      // Only show if overlay is still in DOM
      if (overlay.parentNode) {
        void overlay.offsetWidth;
        overlay.classList.add("show");
        setTimeout(() => {
          overlay.classList.remove("show");
          setTimeout(() => overlay.remove(), 1800);
        }, 1800);
      }
      videoElement.removeEventListener("playing", onPlay);
    };
    videoElement.addEventListener("playing", onPlay);
  }
}

function createLightboxMediaElement(type, src, posterUrl = null) {
  if (type === "image") {
    const imgElement = createEl("img");
    imgElement.alt = "Project Lightbox Image";
    imgElement.src = src;
    return imgElement;
  } else if (type === "video") {
    const videoElement = createEl("video");
    videoElement.alt = "Project Lightbox Video";
    videoElement.controls = false;
    videoElement.autoplay = true;
    videoElement.loop = true;
    videoElement.setAttribute("playsinline", "");
    if (isDesktop()) {
      videoElement.muted = userPrefersMuted;
      if (userPrefersMuted) {
        videoElement.setAttribute("muted", "");
      } else {
        videoElement.removeAttribute("muted");
      }
    } else {
      videoElement.muted = true;
      videoElement.setAttribute("muted", "");
    }
    videoElement.src = src;
    if (posterUrl) videoElement.poster = posterUrl;

    const wrapper = document.createElement("div");
    wrapper.style.position = "relative"; // Keep for overlay positioning
    wrapper.style.display = "inline-block"; // Changed from 'block' to allow shrink-to-fit
    wrapper.style.flexGrow = "0";
    wrapper.style.flexShrink = "0";
    wrapper.style.maxHeight = "100%";
    wrapper.style.maxWidth = "100%"; // Added to ensure it respects parent bounds
    wrapper.style.verticalAlign = "middle"; // Added for better inline-block alignment

    wrapper.appendChild(videoElement);

    const spinner = createSpinnerOverlay();
    wrapper.appendChild(spinner);
    let hasPlayed = false;
    function hideSpinner() {
      if (spinner.parentNode) spinner.parentNode.removeChild(spinner);
    }
    function showMuteIfPlayed() {
      if (hasPlayed) showMuteIconOverlay(videoElement, videoElement.muted);
    }
    // Remove spinner only when video is actually playing
    videoElement.addEventListener("playing", () => {
      hasPlayed = true;
      hideSpinner();
      showMuteIconOverlay(videoElement, videoElement.muted);
    });
    // Fallback: hide spinner after 8s if video never plays
    setTimeout(() => {
      if (!hasPlayed) hideSpinner();
    }, 8000);
    videoElement.addEventListener("click", (e) => {
      e.stopPropagation();
      videoElement.muted = !videoElement.muted;
      if (videoElement.muted) {
        videoElement.setAttribute("muted", "");
      } else {
        videoElement.removeAttribute("muted");
      }
      // Update global preference and persist ONLY on desktop
      if (isDesktop()) {
        userPrefersMuted = videoElement.muted;
        if (window.sessionStorage) {
          sessionStorage.setItem("projectsUserPrefersMuted", userPrefersMuted);
        }
      }
      showMuteIfPlayed();
    });
    if (!isTouchDevice()) {
      let fadeOutTimeout = null;
      wrapper.addEventListener("mouseenter", () => {
        if (fadeOutTimeout) {
          clearTimeout(fadeOutTimeout);
          fadeOutTimeout = null;
        }
        showMuteIconOverlay(videoElement, videoElement.muted);
      });
      wrapper.addEventListener("mouseleave", () => {
        if (fadeOutTimeout) clearTimeout(fadeOutTimeout);
        fadeOutTimeout = setTimeout(() => {
          // Remove overlay after 2s delay, then fade out
          const overlay = wrapper.querySelector(".mute-icon-overlay");
          if (overlay) {
            overlay.classList.remove("show");
            setTimeout(() => {
              if (overlay.parentNode) overlay.remove();
            }, 200);
          }
        }, 2000); // 2 seconds delay before fade out
      });
      // Also update overlay if mute state changes while hovered
      videoElement.addEventListener("volumechange", () => {
        if (wrapper.matches(":hover")) {
          showMuteIconOverlay(videoElement, videoElement.muted);
        }
      });
    }
    return wrapper;
  }
  return null;
}

document.addEventListener("DOMContentLoaded", async () => {
  const lightbox = document.getElementById("project-lightbox");
  const lightboxContent = document.getElementById("lightbox-content");
  const lightboxDetails = document.getElementById("lightbox-details");
  const feedContainer = document.querySelector(".feed-container");

  userPrefersDescriptionVisible = isDesktop(); // Initialize based on view

  if (!lightbox || !lightboxContent || !lightboxDetails || !feedContainer) {
    return;
  }

  // Fetch projects.json and render posts
  let projects = [];
  try {
    const response = await fetch("/projects.json");
    projects = await response.json();
  } catch (e) {
    console.error("Failed to load projects.json", e);
    return;
  }

  // Helper to ensure asset paths are absolute from web root
  function toAbsoluteAssetPath(path) {
    if (!path) return path;
    if (path.startsWith("/")) return path;
    if (path.startsWith("assets/")) return "/" + path;
    return path;
  }

  // Helper to create post element
  function createPostElement(project, idx) {
    const post = document.createElement("div");
    post.className = `post ${project.type}-post`;
    post.dataset.type = project.type;
    post.dataset.src = toAbsoluteAssetPath(project.src);
    if (project.fullVideoSrc) { // Store full video src if available
        post.dataset.fullSrc = toAbsoluteAssetPath(project.fullVideoSrc);
    }
    if (project.poster) post.dataset.poster = toAbsoluteAssetPath(project.poster);
    post.dataset.title = project.title;
    post.dataset.software = project.software;
    post.dataset.description = project.description;
    post.dataset.bulletPoints = project.bulletPoints ? project.bulletPoints.join("|") : "";
    post.dataset.toolsUsed = project.toolsUsed ? project.toolsUsed.join(", ") : "";
    post.dataset.idx = idx;

    if (project.type === "image") {
      const img = document.createElement("img");
      img.src = toAbsoluteAssetPath(project.src);
      img.alt = project.alt || project.title || "Project Image";
      post.appendChild(img);
    } else if (project.type === "video") {
      const video = document.createElement("video");
      video.src = toAbsoluteAssetPath(project.src);
      if (project.poster) video.poster = toAbsoluteAssetPath(project.poster);
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.setAttribute("playsinline", "");
      video.alt = project.alt || project.title || "Project Video";
      post.appendChild(video);
    }
    return post;
  }

  // Clear and populate feed
  feedContainer.innerHTML = "";
  projects.forEach((project, idx) => {
    const post = createPostElement(project, idx);
    feedContainer.appendChild(post);
  });

  // Now that posts are rendered, continue with the rest of the initialization
  let allPosts = Array.from(document.querySelectorAll(".post"));

  function setHomeButtonEnabledInParent(enabled) {
    sendMessageToParent({ type: "set-home-enabled", enabled });
  }

  // Centralized function to update lightbox details
  function updateLightboxDetails(title, description) {
    clearChildren(lightboxDetails);
    if (title) {
      lightboxDetails.appendChild(createEl("div", null, title)).id =
        "lightbox-title";
    }
    // Removed subheading logic
    // Only add description to lightboxDetails if not on desktop (desktop uses animated card)
    if (description && !isDesktop()) {
      const descEl = createEl("div", null, description);
      descEl.id = "lightbox-description";
      lightboxDetails.appendChild(descEl);
    }
  }

  function openLightbox() {
    // Pause all grid videos ONLY when opening the lightbox
    document
      .querySelectorAll(".feed-container .video-post video")
      .forEach((v) => {
        v.pause();
      });
    // When lightbox opens, the grid videos are not interactive, so their intersection observer should be off.
    if (typeof cleanupIntersectionObserver === "function") {
      cleanupIntersectionObserver();
    }

    // Core content setup is now handled by openLightboxByIndex
    if (currentLightboxIndex === null) {
      // This should ideally be set by the click handler before openLightbox is called.
      // As a fallback, try to find it if only one post exists for some reason (unlikely).
      if (allPosts.length === 1) currentLightboxIndex = 0;
      else {
        return; // Cannot proceed without a current index
      }
    }
    openLightboxByIndex(currentLightboxIndex, 0); // Direction 0 for initial open

    lightbox.style.display = "flex";
    lightbox.classList.remove("fade-out");
    void lightbox.offsetWidth; // reflow
    requestAnimationFrame(() => {
      lightbox.classList.add("fade-in");
    });
    document.body.style.overflow = "hidden";
    lightbox.style.visibility = "";
    setHomeButtonEnabledInParent(true);
  }

  function closeLightbox() {
    lightbox.classList.remove("fade-in");
    lightbox.classList.add("fade-out");
    let transitionEnded = false;
    const onTransitionEnd = (e) => {
      if (e.target === lightbox && e.propertyName === "opacity") {
        transitionEnded = true;
        lightbox.style.display = "none";
        lightbox.classList.remove("fade-out");
        lightbox.removeEventListener("transitionend", onTransitionEnd);
        lightbox.style.visibility = "hidden";
        lightbox.style.opacity = "";
        if (lightboxContent) lightboxContent.style.opacity = "";
      }
    };
    lightbox.addEventListener("transitionend", onTransitionEnd);
    setTimeout(() => {
      if (!transitionEnded && lightbox.classList.contains("fade-out")) {
        lightbox.style.display = "none";
        lightbox.classList.remove("fade-out");
        lightbox.removeEventListener("transitionend", onTransitionEnd);
        lightbox.style.visibility = "hidden";
        lightbox.style.opacity = "";
        if (lightboxContent) lightboxContent.style.opacity = "";
      }
    }, 300);
    const mediaElement = lightboxContent.querySelector("video, img");
    if (mediaElement && mediaElement.tagName === "VIDEO") {
      mediaElement.pause();
      mediaElement.removeAttribute("src");
      mediaElement.load();
    }
    clearChildren(lightboxContent);
    clearChildren(lightboxDetails);
    document.body.style.overflow = "";
    setHomeButtonEnabledInParent(false);

    lightbox
      .querySelectorAll(
        ".lightbox-title-overlay, .lightbox-description-overlay",
      )
      .forEach((o) => o.remove());

    // Notify parent that lightbox is closed (disable back/forward/desc)
    sendMessageToParent({ type: "lightbox-state", open: false });

    // Restore grid video playback logic after closing lightbox
    if (typeof isMaximized !== "undefined" && isMaximized) {
      if (typeof cleanupIntersectionObserver === "function") {
        cleanupIntersectionObserver(); // Ensure observer is off before manually playing
      }
      gridVideos.forEach((video) => video.play()); // Play all when maximized and lightbox closes
    } else if (typeof setupIntersectionObserver === "function") {
      // Pause all first, then let the observer decide based on visibility
      gridVideos.forEach((video) => video.pause());
      setupIntersectionObserver();
    }
  }

  // --- Lightbox Description Overlay ---
  function createLightboxOverlay(text, position = "bottom") {
    const className =
      position === "top"
        ? "lightbox-title-overlay"
        : "lightbox-description-overlay";
    const overlay = createEl("div", className);

    if (position === "top") {
      // Add the "PERSONAL PROJECT" label for top overlays (mobile title)
      const projectLabelEl = createEl(
        "div",
        "mobile-overlay-project-label",
        "PERSONAL PROJECT",
      );
      overlay.appendChild(projectLabelEl);
    } else if (position === "bottom") {
      // Add the "DESCRIPTION" label for bottom overlays (mobile description)
      const descriptionLabelEl = createEl(
        "div",
        "mobile-overlay-description-label",
        "DESCRIPTION",
      );
      overlay.appendChild(descriptionLabelEl); // Prepend by convention of adding before textSpan
    }

    // Add the main text content (title or description)
    const textSpan = createEl(
      "span",
      className === "lightbox-title-overlay"
        ? "lightbox-overlay-title-text"
        : "",
    );
    textSpan.innerHTML = text || ""; // Use innerHTML to allow <br>
    overlay.appendChild(textSpan);

    return overlay;
  }

  // function to handle toggling of BOTH mobile overlays (top title, bottom description)
  function toggleMobileOverlays(titleText) {
    const overlayContainer = document.getElementById("lightbox-inner-wrapper"); // Use the correct container
    if (!overlayContainer || isDesktop()) return;

    // click handler for tapping on overlays to hide them
    const handleOverlayTap = function (event) {
      event.stopPropagation(); // Prevent tap from bubbling up

      // Get both overlays, whether tapped or not, if they are currently shown
      const titleToHide = overlayContainer.querySelector(
        ".lightbox-title-overlay.show",
      );
      const descToHide = overlayContainer.querySelector(
        ".lightbox-description-overlay.show",
      );

      if (titleToHide) {
        titleToHide.style.animation = ""; // Clear inline animation
        titleToHide.style.transition = "";
        titleToHide.classList.remove("show");
        titleToHide.classList.add("hide-anim");
        titleToHide.style.pointerEvents = "none";
        titleToHide.addEventListener(
          "animationend",
          function onHide() {
            this.removeEventListener("animationend", onHide);
            if (this.parentNode) this.parentNode.removeChild(this);
          },
          { once: true },
        );
      }

      if (descToHide) {
        descToHide.style.animation = ""; // Clear inline animation
        descToHide.style.transition = "";
        descToHide.classList.remove("show");
        descToHide.classList.add("hide-anim");
        descToHide.style.pointerEvents = "none";
        descToHide.addEventListener(
          "animationend",
          function onHide() {
            this.removeEventListener("animationend", onHide);
            if (this.parentNode) this.parentNode.removeChild(this);
          },
          { once: true },
        );
      }

      // If at least one was hidden, update state
      if (titleToHide || descToHide) {
        userPrefersDescriptionVisible = false;
        sendMessageToParent({ type: "description-state", open: false });
        sendMessageToParent({
          type: "throttle-toolbar",
          key: "view-description",
        });
      }
    };

    // --- Handle Top Title Overlay ---
    let titleOverlay = overlayContainer.querySelector(".lightbox-title-overlay");
    if (!titleOverlay) {
      // If it doesn't exist, create and show it
      titleOverlay = createLightboxOverlay(titleText, "top");
      overlayContainer.appendChild(titleOverlay);
      void titleOverlay.offsetWidth; // Reflow
      titleOverlay.classList.remove("hide-anim");
      titleOverlay.classList.add("show");
      titleOverlay.style.pointerEvents = "auto";
      titleOverlay.removeEventListener("click", handleOverlayTap); // Remove if somehow present
      titleOverlay.addEventListener("click", handleOverlayTap); // Add tap listener
    } else {
      // If it exists, toggle its visibility
      if (titleOverlay.classList.contains("show")) {
        titleOverlay.style.animation = "";
        titleOverlay.style.transition = "";
        titleOverlay.classList.remove("show");
        titleOverlay.classList.add("hide-anim");
        titleOverlay.style.pointerEvents = "none";
        titleOverlay.addEventListener(
          "animationend",
          function onHide() {
            this.removeEventListener("animationend", onHide);
            if (this.parentNode) this.parentNode.removeChild(this);
          },
          { once: true },
        );
        // Listener remains, but pointer-events: none will prevent clicks when hidden
      } else {
        titleOverlay.remove(); // Clean up any remnants if we are re-creating it to show
        titleOverlay = createLightboxOverlay(titleText, "top");
        overlayContainer.appendChild(titleOverlay);
        void titleOverlay.offsetWidth;
        titleOverlay.classList.remove("hide-anim");
        titleOverlay.classList.add("show");
        titleOverlay.style.pointerEvents = "auto";
        titleOverlay.removeEventListener("click", handleOverlayTap);
        titleOverlay.addEventListener("click", handleOverlayTap); // Add tap listener
      }
    }

    // --- Handle Bottom Description Overlay (similar logic) ---
    let descOverlay = overlayContainer.querySelector(
      ".lightbox-description-overlay",
    );
    if (!descOverlay) {
      // If it doesn't exist, create and show it
      const currentPostDataForOverlay = allPosts[currentLightboxIndex]
        ? allPosts[currentLightboxIndex].dataset
        : {};
      const actualDescriptionForOverlay =
        currentPostDataForOverlay.mobileDescription ||
        currentPostDataForOverlay.description ||
        "";
      descOverlay = createLightboxOverlay(
        actualDescriptionForOverlay,
        "bottom",
      );
      overlayContainer.appendChild(descOverlay);
      void descOverlay.offsetWidth;
      descOverlay.classList.remove("hide-anim");
      descOverlay.classList.add("show");
      descOverlay.style.pointerEvents = "auto";
      descOverlay.removeEventListener("click", handleOverlayTap);
      descOverlay.addEventListener("click", handleOverlayTap); // Add tap listener
    } else {
      // If it exists, toggle its visibility
      if (descOverlay.classList.contains("show")) {
        descOverlay.style.animation = "";
        descOverlay.style.transition = "";
        descOverlay.classList.remove("show");
        descOverlay.classList.add("hide-anim");
        descOverlay.style.pointerEvents = "none";
        descOverlay.addEventListener(
          "animationend",
          function onHide() {
            this.removeEventListener("animationend", onHide);
            if (this.parentNode) this.parentNode.removeChild(this);
          },
          { once: true },
        );
      } else {
        descOverlay.remove(); // Clean up any remnants if we are re-creating it to show
        const currentPostDataForOverlay = allPosts[currentLightboxIndex]
          ? allPosts[currentLightboxIndex].dataset
          : {};
        const actualDescriptionForOverlay =
          currentPostDataForOverlay.mobileDescription ||
          currentPostDataForOverlay.description ||
          "";
        descOverlay = createLightboxOverlay(
          actualDescriptionForOverlay,
          "bottom",
        );
        overlayContainer.appendChild(descOverlay);
        void descOverlay.offsetWidth;
        descOverlay.classList.remove("hide-anim");
        descOverlay.classList.add("show");
        descOverlay.style.pointerEvents = "auto";
        descOverlay.removeEventListener("click", handleOverlayTap);
        descOverlay.addEventListener("click", handleOverlayTap); // Add tap listener
      }
    }

    // After handling both overlays, update the persistent state based on their visibility
    const currentlyVisibleTitle = overlayContainer.querySelector(
      ".lightbox-title-overlay.show",
    );
    const currentlyVisibleDesc = overlayContainer.querySelector(
      ".lightbox-description-overlay.show",
    );
    userPrefersDescriptionVisible =
      currentlyVisibleTitle || currentlyVisibleDesc ? true : false;

    sendMessageToParent({
      type: "description-state",
      open: userPrefersDescriptionVisible,
    });
    // Throttle the toolbar button in the parent shell (for visual feedback)
    sendMessageToParent({ type: "throttle-toolbar", key: "view-description" });
  }

  function toggleLightboxOverlay(wrapper) {
    // description parameter is now ignored for desktop card content
    if (!wrapper) {
      console.warn("toggleLightboxOverlay called without a wrapper.");
      return;
    }
    if (isDesktop()) {
      const isCurrentlyVisible = wrapper.classList.contains("desc-visible");

      if (isCurrentlyVisible) {
        // HIDING LOGIC
        wrapper.classList.remove("desc-visible");
        userPrefersDescriptionVisible = false;
        sendMessageToParent({ type: "description-state", open: false });
      } else {
        // SHOWING LOGIC
        let animWrapper = wrapper.querySelector(".desc-card-anim-wrapper");

        if (!animWrapper) {
          const currentPostData = allPosts[currentLightboxIndex]
            ? allPosts[currentLightboxIndex].dataset
            : {};
          animWrapper = createDesktopDescriptionCard(
            currentPostData.title,
            currentPostData.description,
            currentPostData.bulletPoints, // Pass bullet points
            currentPostData.toolsUsed, // Pass tools used
          );
          wrapper.appendChild(animWrapper);
        }

        if (animWrapper) {
          animWrapper.style.width = "";
          void animWrapper.offsetHeight;
        }

        wrapper.classList.add("desc-visible");
        userPrefersDescriptionVisible = true;
        sendMessageToParent({ type: "description-state", open: true });
      }
    }
    // NO ELSE BLOCK HERE
  }

  let currentLightboxIndex = null;

  // Ensure a persistent wrapper exists
  function getOrCreateWrapper() {
    let wrapper = lightboxContent.querySelector(".lightbox-media-wrapper");
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.className = "lightbox-media-wrapper";
      // No inline styles should be applied here; CSS will handle styling.
      lightboxContent.appendChild(wrapper);
    }
    return wrapper;
  }

  // Function to open a specific lightbox item by its index in the allPosts array.
  // Handles animating out the old content and animating in the new content.
  // Direction: 1 for next, -1 for previous, 0 for no specific direction (initial open).
  // skipFadeIn: boolean, for mobile swipe, uses a slide transition instead of fade for new media.
  function openLightboxByIndex(index, direction = 0, skipFadeIn = false) {
    if (index < 0) index = allPosts.length - 1;
    if (index >= allPosts.length) index = 0;
    const post = allPosts[index];
    if (!post) return;
    currentLightboxIndex = index; // Update the global index

    const type = post.dataset.type;
    // Use fullSrc for lightbox if available, otherwise fallback to src
    const lightboxVideoSrc = post.dataset.fullSrc || post.dataset.src;
    const poster = post.dataset.poster || null;
    const title = post.dataset.title;
    const desktopDescription = post.dataset.description;
    const mobileDescription = post.dataset.mobileDescription;
    const bulletPoints = post.dataset.bulletPoints; // Get bullet points

    // Always use a persistent wrapper for lightbox media and description
    const wrapper = getOrCreateWrapper();

    // --- Animation Coordination for Content Swap ---
    // Flags to track if old media and description card have finished their exit animations.
    const oldMedia = wrapper.querySelector("img, video");
    const oldAnimWrapper = wrapper.querySelector(".desc-card-anim-wrapper");
    let mediaFaded = !oldMedia; // True if no old media to animate out
    let descCardFadedOut = !oldAnimWrapper; // True if no old description card anim wrapper to animate out
    let mobileTitleOverlayFadedOut = true; // Assume true if not mobile or no overlay
    let mobileDescOverlayFadedOut = true; // Assume true if not mobile or no overlay

    // If this is a navigation call (not initial open), and old content exists,
    // we treat the old content as "ready to be replaced" for the purpose of trySwapInNewContent.
    // Touch navigation handles its own slide-out animation *before* calling this function.
    // Toolbar navigation currently has no specific fade-out of old content *before* calling this.
    if (direction !== 0) {
      // 0 is initial open, 1 or -1 is navigation
      if (oldMedia) {
        // If old media element exists
        mediaFaded = true;
      }
      if (oldAnimWrapper) {
        // If old description card's animation wrapper exists
        descCardFadedOut = true;
      }
    }

    // --- NEW: Fade out mute icon overlay if present ---
    if (oldMedia && oldMedia.parentElement) {
      const muteOverlay = oldMedia.parentElement.querySelector(
        ".mute-icon-overlay.show",
      );
      if (muteOverlay) {
        muteOverlay.classList.remove("show");
        let removed = false;
        const removeMuteOverlay = () => {
          if (removed) return;
          removed = true;
          muteOverlay.removeEventListener("transitionend", removeMuteOverlay);
          if (muteOverlay.parentNode)
            muteOverlay.parentNode.removeChild(muteOverlay);
        };
        muteOverlay.addEventListener("transitionend", removeMuteOverlay);
        setTimeout(removeMuteOverlay, 250); // Fallback in case transitionend doesn't fire
      }
    }

    // --- Mobile Overlays: Cleanup after swipe OR Trigger hide animation for non-swipe ---
    if (isTouchDevice()) {
      const overlayParentForQuery = document.getElementById(
        "lightbox-inner-wrapper",
      );
      if (overlayParentForQuery) {
        if (direction !== 0) {
          // It's a swipe that navigated
          // Overlays were already faded by setSwipeContentTransform during the swipe.
          // Just remove them directly to prevent animation conflicts.
          const titleToRemove = overlayParentForQuery.querySelector(
            ".lightbox-title-overlay",
          );
          if (titleToRemove) titleToRemove.remove();
          mobileTitleOverlayFadedOut = true; // Mark as done immediately

          const descToRemove = overlayParentForQuery.querySelector(
            ".lightbox-description-overlay",
          );
          if (descToRemove) descToRemove.remove();
          mobileDescOverlayFadedOut = true; // Mark as done immediately
        } else {
          // Not a swipe: Use original logic for CSS animation hide (e.g., for initial open if applicable)
          const activeTitleOverlay = overlayParentForQuery.querySelector(
            ".lightbox-title-overlay.show",
          );
          if (activeTitleOverlay) {
            mobileTitleOverlayFadedOut = false; // Mark as needing to fade via CSS
            activeTitleOverlay.style.animation = "";
            activeTitleOverlay.style.transition = "";
            activeTitleOverlay.classList.remove("show");
            activeTitleOverlay.classList.add("hide-anim");
            activeTitleOverlay.style.pointerEvents = "none";
            let titleOverlayHandled = false;
            const onTitleHide = () => {
              if (titleOverlayHandled) return;
              titleOverlayHandled = true;
              activeTitleOverlay.removeEventListener(
                "animationend",
                onTitleHide,
              );
              if (activeTitleOverlay.parentNode)
                activeTitleOverlay.parentNode.removeChild(activeTitleOverlay);
              mobileTitleOverlayFadedOut = true;
              trySwapInNewContent();
            };
            activeTitleOverlay.addEventListener("animationend", onTitleHide, {
              once: true,
            });
            setTimeout(() => {
              if (!titleOverlayHandled) {
                if (activeTitleOverlay && activeTitleOverlay.parentNode)
                  activeTitleOverlay.remove();
                mobileTitleOverlayFadedOut = true;
                trySwapInNewContent();
              }
            }, 300);
          }

          const activeDescOverlay = overlayParentForQuery.querySelector(
            ".lightbox-description-overlay.show",
          );
          if (activeDescOverlay) {
            mobileDescOverlayFadedOut = false; // Mark as needing to fade via CSS
            activeDescOverlay.style.animation = "";
            activeDescOverlay.style.transition = "";
            activeDescOverlay.classList.remove("show");
            activeDescOverlay.classList.add("hide-anim");
            activeDescOverlay.style.pointerEvents = "none";
            let descOverlayHandled = false;
            const onDescHide = () => {
              if (descOverlayHandled) return;
              descOverlayHandled = true;
              activeDescOverlay.removeEventListener("animationend", onDescHide);
              if (activeDescOverlay.parentNode)
                activeDescOverlay.parentNode.removeChild(activeDescOverlay);
              mobileDescOverlayFadedOut = true;
              trySwapInNewContent();
            };
            activeDescOverlay.addEventListener("animationend", onDescHide, {
              once: true,
            });
            setTimeout(() => {
              if (!descOverlayHandled) {
                if (activeDescOverlay && activeDescOverlay.parentNode)
                  activeDescOverlay.remove();
                mobileDescOverlayFadedOut = true;
                trySwapInNewContent();
              }
            }, 300);
          }
        }
      }
    }

    // This function is called after old media or old description card finishes animating out.
    // It checks if *both* are done before proceeding to swap in the new content.
    function trySwapInNewContent() {
      if (
        mediaFaded &&
        descCardFadedOut &&
        mobileTitleOverlayFadedOut &&
        mobileDescOverlayFadedOut
      ) {
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        wrapper.classList.remove("image-media-active", "video-media-active");
        if (type === "video") {
          wrapper.classList.add("video-media-active");
        } else if (type === "image") {
          wrapper.classList.add("image-media-active");
        }

        // Use lightboxVideoSrc for creating the media element
        let newMedia = createLightboxMediaElement(type, lightboxVideoSrc, poster);

        if (newMedia) {
          if (!(skipFadeIn && !isDesktop())) {
            // Desktop toolbar nav & initial desktop open hits this path
            if (direction !== 0) {
              // If it's a navigation (not initial open) on desktop
              newMedia.style.opacity = "0";
              wrapper.appendChild(newMedia);
              void newMedia.offsetWidth; // Force reflow
              newMedia.style.transition = "opacity 0.5s ease-in-out"; // Slower and smoother
              newMedia.style.opacity = "1";
              // Clear the inline transition after it completes
              setTimeout(() => {
                if (newMedia && newMedia.style) {
                  // Check if newMedia still exists and has style property
                  newMedia.style.transition = "";
                }
              }, 500); // Updated duration
            } else {
              // Initial open on desktop
              wrapper.appendChild(newMedia);
              // For initial open, the whole lightbox fades in, so media appears with it.
            }
          } else {
            // Slide animation for mobile swipe (existing logic)
            const slideFrom =
              direction === 1 ? "100vw" : direction === -1 ? "-100vw" : "100vw";
            newMedia.style.transform = `translateX(${slideFrom})`; // Corrected template literal
            newMedia.style.transition =
              "transform 400ms cubic-bezier(0.4,0,0.2,1)";
            newMedia.style.opacity = "1";
            newMedia.style.visibility = "visible";
            newMedia.style.display =
              newMedia.tagName === "IMG" || newMedia.tagName === "VIDEO"
                ? "block"
                : "flex";

            wrapper.appendChild(newMedia);
            void newMedia.offsetWidth;
            setTimeout(() => {
              newMedia.style.transform = "translateX(0)";
            }, 10);
          }
        }

        if (isDesktop()) {
          if (wrapper.classList.contains("desc-visible")) {
            wrapper.classList.remove("desc-visible");
            void wrapper.offsetHeight;
          }
          // Pass bulletPoints here when creating the card
          const newAnimWrapper = createDesktopDescriptionCard(
            title,
            desktopDescription,
            bulletPoints,
            post.dataset.toolsUsed, // Pass tools used data
          );
          wrapper.appendChild(newAnimWrapper);

          if (userPrefersDescriptionVisible) {
            void newAnimWrapper.offsetHeight;
            wrapper.classList.add("desc-visible");
          } else {
            wrapper.classList.remove("desc-visible");
          }
        } else {
          const overlayParentForManage = document.getElementById(
            "lightbox-inner-wrapper",
          );
          if (overlayParentForManage) {
            // Always remove any existing overlays from the new parent before potentially showing new ones
            overlayParentForManage
              .querySelectorAll(
                ".lightbox-title-overlay, .lightbox-description-overlay",
              )
              .forEach((o) => o.remove());

            if (userPrefersDescriptionVisible) {
              // Call toggleMobileOverlays to create/show new overlays for the current item.
              // This ensures the tap listeners are correctly attached by toggleMobileOverlays.
              const postData = allPosts[currentLightboxIndex].dataset;
              const newTitle = postData.title || "";
              // The description will be fetched by toggleMobileOverlays itself based on currentLightboxIndex.
              // The `wrapper` here refers to the `.lightbox-media-wrapper` which is `_mediaWrapper` in toggleMobileOverlays.
              if (skipFadeIn) {
                setTimeout(() => {
                  toggleMobileOverlays(newTitle, "", wrapper);
                }, 600);
              } else {
                toggleMobileOverlays(newTitle, "", wrapper);
              }
            } else {
              // If overlays are not supposed to be visible, ensure state reflects that (already handled by toggleMobileOverlays if it were called to hide)
              userPrefersDescriptionVisible = false;
              sendMessageToParent({ type: "description-state", open: false });
            }
          }
        }

        updateLightboxDetails(
          title,
          isDesktop() ? null : mobileDescription || desktopDescription,
        );

        sendMessageToParent({ type: "description-state", open: isDesktop() });
        sendMessageToParent({
          type: "lightbox-state",
          open: true,
        });
        sendMessageToParent({
          type: "description-state",
          open: userPrefersDescriptionVisible,
        });
      }
    }
    trySwapInNewContent(); // Initial check in case there was nothing to animate out
  }

  // Modify the post click handler to only open the lightbox
  allPosts.forEach((post, idx) => {
    post.addEventListener("click", (event) => {
      if (event.target.tagName === "A") {
        return;
      }
      currentLightboxIndex = idx; // Set current index here

      // Simplified call to openLightbox as it no longer needs explicit data passed
      const type = post.dataset.type; // Still need to check if post is valid to open
      const sourceData = post.dataset.src; // Still need to check if post is valid to open
      if (type && sourceData) {
        openLightbox();
      }
    });
  });

  /**
   * Applies transform to the lightbox content for swipe effect.
   * @param {number} dx - Horizontal translation in px.
   * @param {number} dy - Vertical translation in px.
   * @param {number} scale - Content scaling (used for vertical swipe-to-close).
   */
  function setSwipeContentTransform(
    dx,
    dy,
    scale = 1,
    isDownwardHintSwipe = false,
  ) {
    if (lightboxContent) {
      const media = lightboxContent.querySelector("img, video");
      const overlayHost = document.getElementById("lightbox-inner-wrapper");
      const titleOverlay = overlayHost?.querySelector(
        ".lightbox-title-overlay.show",
      );
      const descOverlay = overlayHost?.querySelector(
        ".lightbox-description-overlay.show",
      );

      let finalScale = scale; // Default to scale from handleTouchMove

      // Determine if overlays exist and are currently shown (for opacity manipulation)
      const titleOverlayIsVisible =
        titleOverlay && titleOverlay.classList.contains("show");
      const descOverlayIsVisible =
        descOverlay && descOverlay.classList.contains("show");

      // Opacity defaults (full opacity)
      if (media) media.style.opacity = "";
      lightbox.style.opacity = "";
      // Default overlay opacity will be handled based on conditions below or by CSS if not touched.
      // Clear any prior JS transitions on overlays before applying new opacity directly for drag.
      if (titleOverlayIsVisible) titleOverlay.style.transition = "none";
      if (descOverlayIsVisible) descOverlay.style.transition = "none";

      if (media && dragIsVertical) {
        if (!isDownwardHintSwipe && dy < 0) {
          // Upward swipe for closing (dy is negative)
          const fadeEnd = 0.95;
          const dragRatio = Math.min(
            1,
            Math.abs(dy) / (window.innerHeight * fadeEnd),
          );
          const fade = 1 - Math.pow(dragRatio, 2);

          media.style.opacity = fade;
          lightbox.style.opacity = fade;
          if (titleOverlayIsVisible) titleOverlay.style.opacity = fade;
          if (descOverlayIsVisible) descOverlay.style.opacity = fade;

          const minScaleForCloseVisual = 0.25;
          finalScale = 1 - (1 - minScaleForCloseVisual) * dragRatio;
        } else if (isDownwardHintSwipe && dy > 0) {
          // Downward hint swipe
          // Media and lightbox main frame remain full opacity (handled by defaults above)
          const hintDragRatio = Math.min(1, dy / 40); // dy is capped at 40 for hint in handleTouchMove
          const hintOverlayOpacity = 1 - hintDragRatio * 0.5; // Fades to 0.5 at max hint drag

          if (titleOverlayIsVisible)
            titleOverlay.style.opacity = hintOverlayOpacity;
          if (descOverlayIsVisible)
            descOverlay.style.opacity = hintOverlayOpacity;
          // finalScale remains `scale` (which is 1 for hint swipe, set in handleTouchMove)
        }
        // For upward swipe with dy=0 or non-hint downward swipe (if that case existed),
        // opacities remain full (reset above), finalScale remains `scale`
      } else if (media && !dragIsVertical) {
        // Horizontal drag
        // Media and lightbox opacities are already reset to full above.
        // Fade overlays horizontally
        const horizontalFadeThreshold = window.innerWidth / 1.8;
        const horizontalDragRatio = Math.min(
          1,
          Math.abs(dx) / horizontalFadeThreshold,
        );
        const horizontalFade = 1 - horizontalDragRatio;
        if (titleOverlayIsVisible) titleOverlay.style.opacity = horizontalFade;
        if (descOverlayIsVisible) descOverlay.style.opacity = horizontalFade;
        // finalScale remains `scale` (which is 1 for horizontal drag)
      }
      // If no media, opacities are already reset to full above. finalScale remains `scale`.

      lightboxContent.style.transform = `translateX(${dx}px) translateY(${dy}px) scale(${finalScale})`;
    }
  }

  let dragStartX = 0; // Initial X position of touch
  let dragCurrentX = 0; // Current X position of touch
  let dragStartY = 0; // Initial Y position of touch
  let dragCurrentY = 0; // Current Y position of touch
  let dragging = false; // Is a drag currently in progress?
  let dragHasMoved = false; // Has the touch moved significantly from start?
  let dragRAF = null; // requestAnimationFrame ID for drag updates
  let dragIsVertical = false; // Is the current drag predominantly vertical?

  /**
   * Touch Start: Initialize drag variables
   * @param {TouchEvent} e
   */
  function handleTouchStart(e) {
    if (e.touches.length === 1) {
      // Single touch only
      dragStartX = e.touches[0].clientX;
      dragCurrentX = dragStartX;
      dragStartY = e.touches[0].clientY;
      dragCurrentY = dragStartY;
      dragging = true;
      dragHasMoved = false;
      dragIsVertical = false;
      if (lightboxContent) {
        lightboxContent.classList.add("swiping");
        lightboxContent.classList.remove("animate");

        const overlayHostForTouchStart = document.getElementById(
          "lightbox-inner-wrapper",
        );
        const titleOverlayForTouchStart = overlayHostForTouchStart?.querySelector(
          ".lightbox-title-overlay.show",
        );
        const descOverlayForTouchStart = overlayHostForTouchStart?.querySelector(
          ".lightbox-description-overlay.show",
        );

        if (titleOverlayForTouchStart) {
          titleOverlayForTouchStart.style.opacity = "1"; // Explicitly set opacity before animation none
          titleOverlayForTouchStart.style.animation = "none";
          titleOverlayForTouchStart.style.transition = "none";
        }
        if (descOverlayForTouchStart) {
          descOverlayForTouchStart.style.opacity = "1"; // Explicitly set opacity before animation none
          descOverlayForTouchStart.style.animation = "none";
          descOverlayForTouchStart.style.transition = "none";
        }
      }
    }
  }

  /**
   * Touch Move: Update content position based on drag
   * @param {TouchEvent} e
   */
  function handleTouchMove(e) {
    if (!dragging || e.touches.length !== 1) return;
    dragCurrentX = e.touches[0].clientX;
    dragCurrentY = e.touches[0].clientY;
    const dx = dragCurrentX - dragStartX;
    const dy = dragCurrentY - dragStartY;

    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragHasMoved = true; // Register movement

    // Determine drag direction (vertical or horizontal) based on initial dominant movement
    if (!dragIsVertical && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
      dragIsVertical = true;
    } else if (
      !dragIsVertical &&
      Math.abs(dx) > Math.abs(dy) &&
      Math.abs(dx) > 8
    ) {
      dragIsVertical = false;
    }

    if (dragRAF) cancelAnimationFrame(dragRAF); // Cancel previous RAF

    if (lightboxContent) {
      if (!dragIsVertical) {
        // Horizontal drag
        dragRAF = requestAnimationFrame(() => {
          setSwipeContentTransform(dx, 0, 1, false); // Pass false for isDownwardHintSwipe
        });
      } else {
        // Vertical drag
        let effectiveDy = dy;
        let scaleToApply = 1;
        let isHintSwipe = false;

        if (dy < 0) {
          // Upward swipe (potential close)
          // effectiveDy is already dy (negative for upward movement)
          const minScale = 0.85; // Initial slight scale down
          scaleToApply =
            1 +
            (minScale - 1) *
              Math.min(1, Math.abs(effectiveDy) / (window.innerHeight / 2));
          // isHintSwipe remains false
        } else if (dy > 0) {
          // Downward swipe (hint)
          effectiveDy = Math.min(dy, 40); // Cap dy for the transform
          // scaleToApply remains 1 (no scaling for hint)
          isHintSwipe = true;
        } else {
          // dy === 0 (no vertical movement)
          effectiveDy = 0; // Ensure it's exactly 0 for transform
          // scaleToApply remains 1
          // isHintSwipe remains false (or could be context-dependent, but false is safe)
        }

        dragRAF = requestAnimationFrame(() => {
          setSwipeContentTransform(0, effectiveDy, scaleToApply, isHintSwipe);
        });
      }
    }
  }

  /**
   * Touch End: Determine action (swipe next/prev, swipe close, or snap back)
   */
  function handleTouchEnd(e) {
    if (!dragging) return;
    dragging = false;
    if (dragRAF) cancelAnimationFrame(dragRAF); // Cancel any pending animation frame

    const dx = dragCurrentX - dragStartX;
    const dy = dragCurrentY - dragStartY;
    const media = lightboxContent.querySelector("img, video");

    if (!dragHasMoved) {
      // This is a TAP
      const isVideo = media && media.tagName === "VIDEO";
      // For videos, the `media` is the <video> tag. Its parent is the wrapper div returned by createLightboxMediaElement.
      const mediaInteractiveElement = isVideo ? media.parentElement : media;

      if (e && e.target && media && 
          (e.target === media || e.target === mediaInteractiveElement)) {
        // Tap was on the media element (img) or the video's interactive area (video tag or its wrapper div).
        // Let the media's own click listener (e.g., for video mute/unmute) handle it.
        // That listener should have e.stopPropagation().
        return; 
      }

      // If tap was not on media, check for overlays to hide (mobile only)
      // Handle the tap itself based on the target
      if (e && e.target && media && e.target === media) {
        // Tap was on video, let video's click handler (which has stopPropagation) do its thing.
        return;
      }
      // Tap was on lightbox content, but not the video.
      // Keep stopPropagation to prevent potential backdrop click issues.
      if (e) {
        e.stopPropagation();
      }
      return;
    }

    let triggerSwipeUp = false;
    let triggerSwipeLeft = false;
    let triggerSwipeRight = false;

    // Determine if swipe thresholds are met based on media's dragged position
    if (media) {
      const rect = media.getBoundingClientRect();
      const draggedBottom = rect.bottom + dy;
      const draggedLeft = rect.left + dx;
      const draggedRight = rect.right + dx;

      // Swipe Up (Close): If media's bottom edge is above vertical center of viewport
      if (
        dragIsVertical &&
        Math.abs(dy) > MIN_SWIPE_DISTANCE &&
        draggedBottom < window.innerHeight / 2 &&
        Math.abs(dy) > Math.abs(dx)
      ) {
        triggerSwipeUp = true;
      }
      // Swipe Left (Next): If media's right edge is left of horizontal center (and horizontal drag)
      if (
        !dragIsVertical &&
        Math.abs(dx) > MIN_SWIPE_DISTANCE &&
        draggedRight < window.innerWidth / 2 &&
        dx < 0 &&
        Math.abs(dx) > Math.abs(dy)
      ) {
        triggerSwipeLeft = true;
      }
      // Swipe Right (Previous): If media's left edge is right of horizontal center (and horizontal drag)
      if (
        !dragIsVertical &&
        Math.abs(dx) > MIN_SWIPE_DISTANCE &&
        draggedLeft > window.innerWidth / 2 &&
        dx > 0 &&
        Math.abs(dx) > Math.abs(dy)
      ) {
        triggerSwipeRight = true;
      }
    }

    if (triggerSwipeUp) {
      if (lightboxContent) {
        lightboxContent.classList.remove("swiping");
        lightboxContent.classList.add("animate"); // Enable CSS transition for smooth close
        const targetY = -window.innerHeight; // Target position off-screen
        const duration = 400; // Animation duration
        const minScale = 0.25; // Final scale before closing

        // Animate content sliding up and scaling down
        lightboxContent.style.transition = `transform ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
        lightboxContent.style.transform = `translateY(${targetY}px) scale(${minScale})`;
        // Animate lightbox background and media opacity to fade out
        lightbox.style.transition = `opacity ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
        lightbox.style.opacity = 0;
        if (media)
          media.style.transition = `opacity ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
        if (media) media.style.opacity = 0;

        // After animation, reset styles and close lightbox
        const onTransitionEnd = () => {
          lightboxContent.removeEventListener("transitionend", onTransitionEnd);
          lightboxContent.classList.remove("animate");
          lightboxContent.style.transition = "";
          lightboxContent.style.transform =
            "translateX(0) translateY(0) scale(1)";
          lightbox.style.transition = "";
          lightbox.style.opacity = "";
          if (media) {
            media.style.transition = "";
            media.style.opacity = "";
          }
          closeLightbox();
        };
        lightboxContent.addEventListener("transitionend", onTransitionEnd);
      }
      return; // Action handled
    }

    if (triggerSwipeLeft) {
      if (currentLightboxIndex !== null) {
        const targetX = -window.innerWidth; // Target position off-screen left
        // Calculate dynamic duration based on how much is left to swipe
        const currentX = dx;
        const remaining = Math.abs(targetX - currentX);
        const total = Math.abs(targetX);
        const baseDuration = 450;
        const duration = Math.min(
          Math.max(180, baseDuration * (remaining / total)),
          350,
        );

        // Fade out overlays if they are visible
        const overlayHost = document.getElementById("lightbox-inner-wrapper");
        if (overlayHost) {
          overlayHost
            .querySelectorAll(
              ".lightbox-title-overlay.show, .lightbox-description-overlay.show",
            )
            .forEach((overlay) => {
              overlay.style.transition = `opacity ${duration * 0.8}ms ease-out`; // Fade slightly faster than slide
              overlay.style.opacity = "0";
              overlay.style.pointerEvents = "none"; // Disable interaction during fade
            });
        }

        lightboxContent.classList.add("animate");
        lightboxContent.style.transition = `transform ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
        lightboxContent.style.transform = `translateX(${targetX}px)`;
        lightbox.style.transition = ""; // Reset lightbox opacity for side swipes
        lightbox.style.opacity = "";

        // After animation, reset transform and open next item
        const onTransitionEnd = () => {
          lightboxContent.removeEventListener("transitionend", onTransitionEnd);
          lightboxContent.classList.remove("animate");
          lightboxContent.style.transition = "";
          lightboxContent.style.transform = `translateX(0)`;
          openLightboxByIndex(currentLightboxIndex + 1, 1, true); // skipFadeIn = true for slide
        };
        lightboxContent.addEventListener("transitionend", onTransitionEnd);
      }
      return; // Action handled
    }

    if (triggerSwipeRight) {
      if (currentLightboxIndex !== null) {
        const targetX = window.innerWidth; // Target position off-screen right
        // Calculate dynamic duration
        const currentX = dx;
        const remaining = Math.abs(targetX - currentX);
        const total = Math.abs(targetX);
        const baseDuration = 450;
        const duration = Math.min(
          Math.max(180, baseDuration * (remaining / total)),
          350,
        );

        // Fade out overlays if they are visible
        const overlayHost = document.getElementById("lightbox-inner-wrapper");
        if (overlayHost) {
          overlayHost
            .querySelectorAll(
              ".lightbox-title-overlay.show, .lightbox-description-overlay.show",
            )
            .forEach((overlay) => {
              overlay.style.transition = `opacity ${duration * 0.8}ms ease-out`; // Fade slightly faster than slide
              overlay.style.opacity = "0";
              overlay.style.pointerEvents = "none"; // Disable interaction during fade
            });
        }

        lightboxContent.classList.add("animate");
        lightboxContent.style.transition = `transform ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
        lightboxContent.style.transform = `translateX(${targetX}px)`;
        lightbox.style.transition = ""; // Reset lightbox opacity
        lightbox.style.opacity = "";

        // After animation, reset transform and open previous item
        const onTransitionEnd = () => {
          lightboxContent.removeEventListener("transitionend", onTransitionEnd);
          lightboxContent.classList.remove("animate");
          lightboxContent.style.transition = "";
          lightboxContent.style.transform = `translateX(0)`;
          openLightboxByIndex(currentLightboxIndex - 1, -1, true); // skipFadeIn = true for slide
        };
        lightboxContent.addEventListener("transitionend", onTransitionEnd);
      }
      return; // Action handled
    }

    if (lightboxContent) {
      lightboxContent.classList.remove("swiping"); // Ensure swiping class is removed
      lightboxContent.classList.add("animate"); // Add .animate class, consistent with other swipe end actions

      // Apply rubber band snap-back for the lightboxContent itself
      const snapDuration = "500ms"; // Duration for the snap
      const rubberBandEasing = "cubic-bezier(0.175, 0.885, 0.32, 1.275)"; // Easing with overshoot

      lightboxContent.style.transition = `transform ${snapDuration} ${rubberBandEasing}`;
      lightboxContent.style.transform = "translateX(0) translateY(0) scale(1)";

      // Reset opacity for media and the main lightbox frame
      if (media) {
        media.style.transition = ""; // Clear its specific transition if set during close attempt
        media.style.opacity = ""; // Reset to full
      }
      lightbox.style.transition = ""; // Reset lightbox opacity
      lightbox.style.opacity = "";

      // Reset overlay opacity and animations on snap back
      const overlayHost = document.getElementById("lightbox-inner-wrapper");
      if (overlayHost) {
        const titleOverlay = overlayHost.querySelector(
          ".lightbox-title-overlay",
        );
        const descOverlay = overlayHost.querySelector(
          ".lightbox-description-overlay",
        );

        const resetOverlay = (overlay) => {
          if (overlay) {
            const isTopOverlay = overlay.classList.contains("lightbox-title-overlay");

            // Clear all potentially conflicting inline styles from drag/swipe phase
            overlay.style.opacity = "";
            overlay.style.transform = "";
            overlay.style.transition = "";
            overlay.style.animation = ""; // Also clear inline animation property

            if (overlay.classList.contains("show")) {
              // Overlay was visible and should re-animate into view.
              overlay.classList.remove("hide-anim"); // Clean up any residual hide class

              // Explicitly set the visual state to the START of its slide-in animation
              overlay.style.opacity = "0"; 
              overlay.style.transform = isTopOverlay ? "translateY(-100%)" : "translateY(100%)";
              
              // Force the browser to recognize the new "from" state before re-adding .show
              void overlay.offsetWidth; 

              // Re-trigger the animation by toggling the .show class
              // No, don't remove .show if it's already there and supposed to be shown.
              // The key is ensuring its prior state is the animation's start point.
              // The class .show should already define the animation.
              // Instead of toggling, ensure CSS can take over from a clean slate.
              // The .show class (which should still be on the element) defines the animation.
              // The problem is usually residual inline styles overriding the animation's 'from' state.
              // By clearing them and setting opacity/transform to anim start, then reflowing,
              // the existing .show class's animation should pick up correctly.
              // One final re-application of a class that *triggers* animation if it's not `.show` itself,
              // or ensuring no conflicting animation like `animation: none` is set.
              // Let's rely on the cleared styles and the existing .show class.
              // If .show *itself* triggers the animation (e.g. `animation-name` is on `.show`), then this should be enough.
              // We might need to force re-application if .show is always present and animation is triggered by sth else.
              // However, our CSS is: `.lightbox-title-overlay.show` { animation: mobileTopOverlaySlideIn... }
              // So the .show class IS the trigger. Removing and re-adding it is the most robust way.
              
              overlay.classList.remove("show");
              void overlay.offsetWidth; // Crucial reflow
              overlay.classList.add("show");

            } else {
              // Overlay was not, and should not be, visible.
              // Ensure it's definitively hidden without animation.
              overlay.style.opacity = "0";
              overlay.style.transform = isTopOverlay ? "translateY(-100%)" : "translateY(100%)";
              overlay.classList.remove("hide-anim"); 
              // No .show class should be present here
            }
          }
        };
        resetOverlay(titleOverlay);
        resetOverlay(descOverlay);
      }

      // Clean up the inline transition on lightboxContent after it finishes
      const onSnapBackEnd = (event) => {
        if (
          event.target === lightboxContent &&
          event.propertyName === "transform"
        ) {
          lightboxContent.removeEventListener("transitionend", onSnapBackEnd);
          lightboxContent.style.transition = ""; // Clear the inline transform transition
          lightboxContent.classList.remove("animate"); // Remove .animate, consistent with swipe-left/right
        }
      };
      lightboxContent.addEventListener("transitionend", onSnapBackEnd);
    }
  }

  // Attach touch listeners to the lightboxContent
  if (lightboxContent) {
    lightboxContent.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    lightboxContent.addEventListener("touchmove", handleTouchMove, {
      passive: true,
    });
    // Pass event to handleTouchEnd so we can check event.target
    lightboxContent.addEventListener("touchend", handleTouchEnd, {
      passive: true,
    });
  }

  // Listen for taps/clicks on the lightbox background to close
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox.style.display === "flex") {
      closeLightbox();
    }
  });

  const feedContainerPosts = Array.from(
    feedContainer.querySelectorAll(".post"),
  );

  function applyMasonryLayout() {
    const currentFeedContainer = document.querySelector(".feed-container"); // Use a local const
    const currentFeedPosts = Array.from(
      currentFeedContainer
        ? currentFeedContainer.querySelectorAll(".post")
        : [],
    );

    if (!currentFeedContainer) {
      // Ensure container exists
      sendMessageToParent({ type: "projects-ready" }); // Send ready even if no container somehow
      return;
    }

    if (currentFeedPosts.length === 0) {
      if (!currentFeedContainer.classList.contains("loaded")) {
        currentFeedContainer.classList.add("loaded");
      }
      currentFeedContainer.style.height = "auto"; // Or some minimal height for empty state
      sendMessageToParent({ type: "projects-ready" });
      return;
    }

    const containerStyle = getComputedStyle(currentFeedContainer);
    const containerPaddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
    const containerPaddingTop = parseFloat(containerStyle.paddingTop) || 0;
    const containerPaddingRight = parseFloat(containerStyle.paddingRight) || 0;
    const containerPaddingBottom =
      parseFloat(containerStyle.paddingBottom) || 0;

    const availableWidth =
      currentFeedContainer.offsetWidth -
      containerPaddingLeft -
      containerPaddingRight;

    let numColumns = 2; // Default for mobile
    const gap = 12; // Gap between posts, both horizontally and vertically

    if (currentFeedContainer.offsetWidth >= 1200) {
      numColumns = 4;
    } else if (currentFeedContainer.offsetWidth >= 768) {
      numColumns = 3;
    }

    const columnWidth = (availableWidth - (numColumns - 1) * gap) / numColumns;

    currentFeedPosts.forEach((post) => {
      post.style.position = "absolute";
      post.style.width = `${columnWidth}px`;
    });

    const columnHeights = Array(numColumns).fill(0);

    currentFeedPosts.forEach((post) => {
      const postHeight = post.offsetHeight;

      let shortestColumnIndex = 0;
      for (let i = 1; i < numColumns; i++) {
        if (columnHeights[i] < columnHeights[shortestColumnIndex]) {
          shortestColumnIndex = i;
        }
      }

      post.style.left = `${containerPaddingLeft + shortestColumnIndex * (columnWidth + gap)}px`;
      post.style.top = `${containerPaddingTop + columnHeights[shortestColumnIndex]}px`;

      columnHeights[shortestColumnIndex] += postHeight + gap;
    });

    const effectiveColumnHeights = columnHeights.map((h) =>
      h > 0 ? h - gap : 0,
    );
    const tallestColumnContentHeight = Math.max(0, ...effectiveColumnHeights);

    currentFeedContainer.style.height = `${containerPaddingTop + tallestColumnContentHeight + containerPaddingBottom}px`;

    // AT THE END OF applyMasonryLayout:
    // Check if reveal is already scheduled or done
    if (!currentFeedContainer.dataset.revealProcessStarted) {
      currentFeedContainer.dataset.revealProcessStarted = "true"; // Set a flag

      // ADDED setTimeout for a 0.5s delay
      setTimeout(() => {
        if (currentFeedContainer) {
          // Check if container still exists
          if (!currentFeedContainer.classList.contains("loaded")) {
            currentFeedContainer.classList.add("loaded"); // Make container visible
          }
          sendMessageToParent({ type: "projects-ready" });
        }
      }, 500); // 0.5 second delay
    } else if (currentFeedContainer.classList.contains("loaded")) {
      // If already loaded (e.g. from a resize after initial load), still send projects-ready
      // to inform parent of potential layout update, but without re-adding class or delay.
      // However, this could be too chatty if applyMasonryLayout is called often on resize.
      // Let's stick to sending 'projects-ready' only on the first reveal via the timeout for now.
      // To make it send on subsequent resizes that *successfully* lay out, we'd send it outside/after this if block.
      // For now, the projects-ready signal is tied to the first reveal.
    }
  }

  function initMasonryWithVideoCheck() {
    if (!feedContainer) return;

    const videos = feedContainerPosts
      .filter((post) => post.querySelector("video"))
      .map((post) => post.querySelector("video"));

    if (videos.length === 0) {
      applyMasonryLayout();
      return;
    }

    let videosToMonitor = videos.length;
    let videosReported = 0;

    const onMediaReady = (mediaElement) => {
      mediaElement.removeEventListener("loadedmetadata", onMediaReadyHandler);
      mediaElement.removeEventListener("loadeddata", onMediaReadyHandler);
      mediaElement.removeEventListener("error", onErrorHandler);

      videosReported++;
      if (videosReported === videosToMonitor) {
        applyMasonryLayout();
      }
    };

    const onMediaReadyHandler = function (event) {
      onMediaReady(this, event.type);
    };
    const onErrorHandler = function (event) {
      onMediaReady(this, event.type); // Count it as "done" to not block layout
    };

    videos.forEach((video) => {
      if (video.readyState >= 2) {
        // HAVE_CURRENT_DATA (should mean dimensions are available)
        videosReported++;
      } else {
        video.addEventListener("loadedmetadata", onMediaReadyHandler);
        video.addEventListener("loadeddata", onMediaReadyHandler); // For some browsers/cases
        video.addEventListener("error", onErrorHandler);
      }
    });

    if (videosReported === videosToMonitor && videosToMonitor > 0) {
      applyMasonryLayout();
    }
  }

  if (feedContainer) {
    initMasonryWithVideoCheck(); // Initial layout calculation

    let resizeTimeout;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      // On resize, assume media dimensions are stable if they were loaded.
      resizeTimeout = setTimeout(applyMasonryLayout, 150);
    });

    // Safety re-layout after 1.2s to catch late-loading videos (especially on mobile)
    setTimeout(applyMasonryLayout, 1200);

    // Re-apply layout on scroll and touchend (mobile interaction)
    window.addEventListener("scroll", () => {
      setTimeout(applyMasonryLayout, 100);
    });
    window.addEventListener("touchend", () => {
      setTimeout(applyMasonryLayout, 100);
    });

    // Notify parent when ready (first load only)
    // Wait for all images and videos to be loaded, then send message
    const posts = Array.from(feedContainer.querySelectorAll(".post"));
    const mediaElements = posts
      .map((post) => post.querySelector("img, video"))
      .filter(Boolean);
    function checkAllLoadedInternal() {
      if (typeof window.projectsLoadedCount === "undefined") {
        window.projectsLoadedCount = 0; // Should be redundant due to above but safe
      }
      window.projectsLoadedCount++;

      // Ensure mediaElements is accessible here or passed appropriately
      // Assuming mediaElements is defined in the outer scope of DOMContentLoaded
      if (window.projectsLoadedCount === mediaElements.length) {
        applyMasonryLayout();
      }
    }

    // Reset the counter at the beginning of each DOMContentLoaded for this iframe instance
    window.projectsLoadedCount = 0;

    if (mediaElements.length > 0) {
      mediaElements.forEach((el) => {
        const isImg = el.tagName === "IMG";
        const isVid = el.tagName === "VIDEO";
        let isAlreadyReady = false;

        if (isImg) {
          isAlreadyReady = el.complete;
        } else if (isVid) {
          isAlreadyReady = el.readyState >= 2; // HAVE_CURRENT_DATA
        }

        if (isAlreadyReady) {
          // Defer to next tick to allow browser to potentially calculate dimensions
          setTimeout(() => checkAllLoadedInternal.call(el), 0);
        } else {
          el.addEventListener("load", checkAllLoadedInternal);
          el.addEventListener("loadeddata", checkAllLoadedInternal);
          el.addEventListener("error", checkAllLoadedInternal);
        }
      });
    } else {
      // No media, proceed directly
      applyMasonryLayout(); // This will now also make container visible and send ready
    }
  }

  // --- Video Grid Play/Pause Logic for Maximized/Unmaximized States ---
  const gridVideos = Array.from(
    document.querySelectorAll(".feed-container .video-post video"),
  );
  let isMaximized = false;
  let intersectionObserver = null;

  function playVisibleVideos() {
    if (!intersectionObserver) return;
    // Play ALL visible videos, pause all non-visible ones
    gridVideos.forEach((video) => {
      if (video.__isIntersecting) {
        // Attempt to play if intersecting
        if (video.paused) {
          video.play().catch(() => {
            // Autoplay was prevented, typically on mobile if not muted or no user interaction yet.
            // Since videos are muted, this is less likely but good to be aware of.
          });
        }
      } else {
        // Pause if not intersecting
        if (!video.paused) {
          video.pause();
        }
      }
    });
  }

  function setupIntersectionObserver() {
    if (intersectionObserver) intersectionObserver.disconnect();
    intersectionObserver = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.__isIntersecting = entry.isIntersecting;
        });
        playVisibleVideos();
      },
      { root: document.querySelector(".scroll-content"), threshold: 0.1 },
    );
    gridVideos.forEach((video) => {
      intersectionObserver.observe(video);
    });
    playVisibleVideos();
  }

  function cleanupIntersectionObserver() {
    if (intersectionObserver) {
      intersectionObserver.disconnect();
      intersectionObserver = null;
    }
    gridVideos.forEach((video) => delete video.__isIntersecting);
  }

  // Helper to check if the lightbox is open
  function isLightboxOpen() {
    const lightbox = document.getElementById("project-lightbox");
    return lightbox && lightbox.style.display === "flex";
  }

  function setMaximizedState(maximized) {
    isMaximized = maximized;
    const bodyEl = document.body;
    const maximizedClassName = "projects-window-maximized";

    if (maximized) {
      bodyEl.classList.add(maximizedClassName);
    } else {
      bodyEl.classList.remove(maximizedClassName);
    }

    const lightboxIsOpen = isLightboxOpen();

    if (lightboxIsOpen) {
      // If lightbox is open, grid videos MUST be paused.
      // The IntersectionObserver for grid videos should be inactive.
      if (typeof cleanupIntersectionObserver === "function") {
        cleanupIntersectionObserver();
      }
      gridVideos.forEach((video) => video.pause());
    } else {
      // Lightbox is closed. Grid video behavior depends on maximize state.
      if (isMaximized) {
        // Window is being maximized (or is already maximized)
        if (typeof cleanupIntersectionObserver === "function") {
          cleanupIntersectionObserver();
        }
        gridVideos.forEach((video) => video.play());
      } else {
        // Window is being restored (unmaximized)
        gridVideos.forEach((video) => video.pause()); // Pause all first
        if (typeof setupIntersectionObserver === "function") {
          setupIntersectionObserver(); // Observer will decide which to play
        }
      }
    }

    // Adjust lightbox description card sizing if lightbox is open
    const lightbox = document.getElementById("project-lightbox");
    if (lightbox && lightbox.style.display === "flex") {
      const mediaWrapper = lightboxContent.querySelector(
        ".lightbox-media-wrapper",
      );
      if (mediaWrapper && mediaWrapper.classList.contains("desc-visible")) {
        const animWrapper = mediaWrapper.querySelector(
          ".desc-card-anim-wrapper",
        );
        if (animWrapper) {
          animWrapper.style.transition = "width 0.4s cubic-bezier(0.4,0,0.2,1)";
        }
      }
    }

    document.querySelectorAll(".video-post").forEach((post) => {
      if (isMaximized) post.classList.add("maximized");
      else post.classList.remove("maximized");
    });
  }

  // Listen for maximize/unmaximize messages from parent
  window.addEventListener("message", (event) => {
    if (event.data && typeof event.data.type === "string") {
      if (event.data.type === "window:maximized") {
        setMaximizedState(true);
      } else if (event.data.type === "window:unmaximized") {
        setMaximizedState(false);
      } else if (event.data.type === "window:restored") {
        // Re-apply the Masonry layout. Using requestAnimationFrame to ensure it runs
        // after the browser has had a chance to update dimensions from the restore.
        requestAnimationFrame(() => {
          if (typeof applyMasonryLayout === "function") {
            applyMasonryLayout();
          }
        });
      }
      if (event.data.type === "toolbar-action") {
        if (event.data.action === "viewDescription") {
          const wrapper = lightboxContent.querySelector(
            ".lightbox-media-wrapper",
          );
          if (currentLightboxIndex !== null && allPosts[currentLightboxIndex]) {
            // If on mobile, show subheading in the bottom overlay
            const currentPostData = allPosts[currentLightboxIndex].dataset;
            if (isTouchDevice()) {
              const titleForToggle = currentPostData.title || "";
              // The 'descriptionText' for toggleMobileOverlays will be the actual description.
              // The title for the top overlay is titleForToggle.
              // The description for the bottom overlay will be fetched inside toggleMobileOverlays itself.
              // Pass the wrapper to the generalized toggle function, using subheading for the bottom overlay
              toggleMobileOverlays(titleForToggle, "", wrapper);
            } else {
              // Desktop: only toggle the description card via the existing logic
              let descForDesktopCard = currentPostData.description || "";
              toggleLightboxOverlay(descForDesktopCard, wrapper);
            }
          }
        } else if (event.data.action === "navigateHome") {
          if (lightbox && lightbox.style.display === "flex") {
            closeLightbox();
          }
        } else if (event.data.action === "navigatePrevious") {
          if (
            lightbox &&
            lightbox.style.display === "flex" &&
            allPosts.length > 0
          ) {
            let newIndex =
              (currentLightboxIndex - 1 + allPosts.length) % allPosts.length;
            openLightboxByIndex(newIndex, -1);
          }
        } else if (event.data.action === "navigateNext") {
          if (
            lightbox &&
            lightbox.style.display === "flex" &&
            allPosts.length > 0
          ) {
            let newIndex = (currentLightboxIndex + 1) % allPosts.length;
            openLightboxByIndex(newIndex, 1);
          }
        }
      }
    }
  });

  // Initialize for default (unmaximized) state
  setupIntersectionObserver();

  // Expose closeLightbox globally for message handler
  window.closeLightbox = closeLightbox;

  document.addEventListener("click", () => {
    // Optionally: filter out clicks inside your own popouts/menus if needed
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "iframe-interaction" }, "*");
    }
  });

  // --- Aggressive Pinch Zoom Prevention (Lightbox Aware) ---
  function shouldPreventZoom(event) {
    const target = event.target;
    // If the event target is inside the lightbox, DO NOT prevent zoom/gestures.
    if (target.closest("#project-lightbox")) {
      return false;
    }
    // Otherwise, prevent zoom.
    return true;
  }

  // Prevent gestures
  document.addEventListener(
    "gesturestart",
    function (e) {
      if (shouldPreventZoom(e)) e.preventDefault();
    },
    { passive: false },
  );
  document.addEventListener(
    "gesturechange",
    function (e) {
      if (shouldPreventZoom(e)) e.preventDefault();
    },
    { passive: false },
  );
  document.addEventListener(
    "gestureend",
    function (e) {
      if (shouldPreventZoom(e)) e.preventDefault();
    },
    { passive: false },
  );

  // Prevent multi-touch interactions (common for pinch-zoom)
  document.addEventListener(
    "touchstart",
    function (e) {
      if (e.touches.length > 1 && shouldPreventZoom(e)) {
        e.preventDefault();
      }
    },
    { passive: false },
  );
  document.addEventListener(
    "touchmove",
    function (e) {
      if (e.touches.length > 1 && shouldPreventZoom(e)) {
        e.preventDefault();
      }
    },
    { passive: false },
  );

  // Prevent double-tap to zoom
  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    function (event) {
      if (!shouldPreventZoom(event)) return;
      const now = new Date().getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false },
  );

  // Prevent Ctrl+wheel zoom and general wheel events on the body
  document.addEventListener(
    "wheel",
    function (event) {
      if (!shouldPreventZoom(event)) return;
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
});
