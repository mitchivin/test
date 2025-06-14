/*
 * lightbox.js - Handles all interactivity for the lightbox modal.
 */

// ===== Global State & Utility Functions (Lightbox Specific) =====
/** @type {number | null} Index of the currently displayed project in `allProjectPostsData`. */
let currentProjectIndex = null;
/** @type {number | null} Index of the currently displayed image/video within the current project's media. */
let currentImageIndex = null;
/** @type {Array<Object>} Array of media items (images/videos) for the current project. */
let currentProjectImages = [];
/** @type {boolean} Flag to prevent concurrent lightbox transitions (e.g., rapid navigation). */
let isLightboxTransitioning = false;
/** @type {boolean} Flag to throttle navigation button clicks. */
let isNavigationThrottled = false;
/** @constant {number} Duration in milliseconds to throttle navigation button clicks. */
const NAVIGATION_THROTTLE_DURATION = 300; // 0.3 seconds
/** @type {number | null} Timeout ID for the lightbox close transition fallback. */
let closeLightboxTimeoutId = null; // Added for managing close timeout

/**
 * @type {Function | null} Event handler for the lightbox close transition.
 * Stored globally to allow removal by Lightbox.open if a previous close was interrupted.
 */
let onLightboxCloseTransitionEnd = null;

// Add generation counter for open/close cycles
let lightboxOpenGeneration = 0;

// Duplicated from projects.js - consider a shared utils.js if more are needed
/**
 * Checks if the current viewport width matches desktop dimensions.
 * @returns {boolean} True if the viewport width is 768px or greater.
 */
function isDesktop() {
  return window.matchMedia("(min-width: 768px)").matches;
}
/**
 * Checks if the current device is a touch-enabled device.
 * @returns {boolean} True if touch events are supported.
 */
function isTouchDevice() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}
/**
 * Helper function to create a DOM element with optional class and text content.
 * @param {string} tag - The HTML tag for the element.
 * @param {string | null} className - Optional class name to add to the element.
 * @param {string} [text] - Optional text content for the element.
 * @returns {HTMLElement} The created DOM element.
 */
function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
/**
 * Removes all child nodes from a given DOM element.
 * @param {HTMLElement} el - The DOM element to clear.
 */
function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}
/**
 * Converts a relative asset path to an absolute path from the main application root.
 * This is specific to the project app's structure.
 * @param {string} path - The relative path to convert.
 * @returns {string} The absolute path, or the original path if already absolute or not recognized.
 */
function toAbsoluteAssetPath(path) {
  if (!path) return path;
  if (path.startsWith("http:") || path.startsWith("https:")) return path;
  if (path.startsWith("../")) return path;
  return "../../../" + path; // Path relative to projects app directory
}
/**
 * Sends a message to the parent window if the current window is an iframe.
 * @param {Object} payload - The message payload to send.
 */
function sendMessageToParent(payload) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(payload, "*");
  }
}
// ===== END Utility Functions =====

// To be populated by initLightbox when DOM is ready
/** @type {HTMLElement | null} The main lightbox container element. */
let lightboxEl = null;
/** @type {HTMLElement | null} The element where lightbox media (image/video) is displayed. */
let lightboxContentEl = null;
/** @type {HTMLElement | null} The element for lightbox textual details (primarily for mobile/fallback). */
let lightboxDetailsEl = null;
/** @type {Array<Object>} Array holding all project data, passed during initialization. */
let allProjectPostsData = []; // Will store data from allPosts

// Global state for persistent description visibility (Lightbox scope)
/**
 * @type {boolean} User's preference for description visibility.
 * True if description should be visible, false otherwise. Loaded from sessionStorage.
 */
let userPrefersDescriptionVisible = false;
/**
 * @type {boolean} User's preference for video mute state.
 * True if videos should start muted. Loaded from sessionStorage. Default is true.
 */
let userPrefersMuted = true;

/** @constant {number} Minimum swipe distance in pixels to trigger a navigation or close action. */
const MIN_SWIPE_DISTANCE = 44;

// Helper: Detect if current project uses a mobile asset (for mute icon logic)
/**
 * Detects if the current project's media uses a mobile-specific asset.
 * This can influence UI elements like the mute icon style.
 * @param {Object} projectData - The data object for the current project.
 * @returns {boolean} True if a mobile-specific poster or source is defined for the current media or project.
 */
function projectUsesMobileAsset(projectData) {
  // Check if the current media item has a mobile poster
  const currentMediaItem = currentProjectImages[currentImageIndex];
  if (currentMediaItem && currentMediaItem.posterMobile) {
    return true;
  }
  // Fallback to checking project data
  return !!projectData.srcMobile;
}

/**
 * Creates and populates the desktop description card with project details.
 * Includes title, main label (client/personal work), description, bullet points, tools used, and navigation dots.
 * @param {string} titleText - The project title.
 * @param {string} descriptionText - The main project description.
 *   (Note: This was previously distinct from `mobileDescriptionText`, now unified from `postData.description`).
 * @param {string} bulletPointsText - Pipe-separated bullet points.
 * @param {string} toolsUsedText - Comma-separated list of tools.
 * @param {number} projectImagesCount - Total number of images/videos for the current project (for nav dots).
 * @param {number} currentImageIdx - Index of the currently displayed image/video (for active nav dot).
 * @returns {HTMLElement} The created description card element.
 */
function createDesktopDescriptionCard(
  titleText,
  descriptionText,
  bulletPointsText,
  toolsUsedText,
  projectImagesCount,
  currentImageIdx,
) {
  const descCard = createEl("div", "lightbox-desc-card");
  clearChildren(descCard);
  const mainContentContainer = createEl("div", "card-main-content");

  // Show CLIENT WORK for client projects, PERSONAL WORK for others
  let mainLabel = "PERSONAL WORK";
  const projectData = allProjectPostsData[currentProjectIndex] || {};
  if (projectData.workType === "client") {
    mainLabel = "CLIENT WORK";
  }
  const titleMainLabelEl = createEl("div", "card-title-main-label", mainLabel);
  mainContentContainer.appendChild(titleMainLabelEl);

  if (titleText) {
    const titleRow = createEl("div", "card-title-row"); // New container for title and dots

    const titleEl = createEl("div", "card-title", titleText);
    titleRow.appendChild(titleEl);

    // --- Navigation Dots Section (Moved into titleRow) ---
    if (projectImagesCount > 1) {
      const dotsContainer = createEl("span", "lightbox-nav-dots");
      for (let i = 0; i < projectImagesCount; i++) {
        const dot = createEl("span", "lightbox-nav-dot");
        dot.dataset.index = i;
        dot.setAttribute("role", "button");
        dot.setAttribute("tabindex", "0");
        dot.setAttribute("aria-label", `Go to image ${i + 1}`);
        if (i === currentImageIdx) {
          dot.classList.add("active");
        }

        const navigateToDot = (event) => {
          event.stopPropagation();
          const targetIndex = parseInt(event.currentTarget.dataset.index, 10);
          if (targetIndex !== currentImageIndex) {
            if (!isLightboxTransitioning && !isNavigationThrottled) {
              _openLightboxByProjectAndImage(
                currentProjectIndex,
                targetIndex,
                0,
                false,
              );
            }
          }
        };

        dot.addEventListener("click", navigateToDot);
        dot.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            navigateToDot(event);
          }
        });
        dotsContainer.appendChild(dot);
      }
      titleRow.appendChild(dotsContainer); // Append dots to titleRow
    }
    // --- End Navigation Dots Section ---

    mainContentContainer.appendChild(titleRow); // Append titleRow to main content

    const divider = createEl("hr", "card-title-divider"); // Divider after titleRow
    mainContentContainer.appendChild(divider);
  }

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

  // --- Tools Used Section --- (Moved here)
  if (toolsUsedText && toolsUsedText.trim() !== "") {
    const toolsDivider = createEl("hr", "card-title-divider"); // Divider first
    mainContentContainer.appendChild(toolsDivider);

    const toolsLabelEl = createEl("div", "card-tools-label", "TOOLS USED"); // Then the label
    mainContentContainer.appendChild(toolsLabelEl);

    const toolsListEl = createEl("div", "card-tools-list");
    const toolsArray = toolsUsedText.split(",").map((tool) => {
      const trimmedTool = tool.trim();
      if (trimmedTool.length > 0) {
        return trimmedTool.charAt(0).toUpperCase() + trimmedTool.slice(1);
      }
      return trimmedTool;
    });
    toolsListEl.textContent = toolsArray.join(", ");
    mainContentContainer.appendChild(toolsListEl);
  }
  // --- End Tools Used Section ---

  descCard.appendChild(mainContentContainer);

  return descCard;
}

/**
 * Creates the HTML structure for a video loading spinner overlay.
 * @returns {HTMLElement} The spinner overlay element.
 */
function createSpinnerOverlay() {
  const overlay = document.createElement("div");
  overlay.className = "video-spinner-overlay";
  overlay.innerHTML = '<div class="video-spinner"></div>';
  return overlay;
}

/**
 * Creates the HTML structure for the mute/unmute icon overlay.
 * Selects different icon assets based on mute state and device context (mobile/desktop).
 * @param {boolean} isMuted - Current mute state of the video.
 * @returns {HTMLElement} The mute icon overlay element.
 */
function createMuteIconOverlay(isMuted) {
  const projectData = allProjectPostsData[currentProjectIndex] || {};
  const isMobile = !isDesktop();
  const useMobileIcons =
    isMobile &&
    (projectUsesMobileAsset(projectData) || projectData.workType === "client");
  const iconName = isMuted
    ? useMobileIcons
      ? "voldownmob"
      : "voldown"
    : useMobileIcons
      ? "volupmob"
      : "volup";
  const overlay = document.createElement("div");
  overlay.className = "mute-icon-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `<img src="../../../assets/apps/projects/icons/${iconName}.webp" alt="${isMuted ? "Muted" : "Unmuted"}" draggable="false" style="width:100%;height:100%;object-fit:contain;" />`;

  return overlay;
}

/**
 * Displays and manages the lifecycle of the mute icon overlay for a video.
 * The icon is shown briefly on video play/interaction or hover (desktop).
 * @param {HTMLVideoElement} videoElement - The video element.
 * @param {boolean} isMuted - The current mute state of the video.
 */
function showMuteIconOverlay(videoElement, isMuted) {
  const existing =
    videoElement.parentElement.querySelector(".mute-icon-overlay");
  if (existing) existing.remove();

  // Don't show mute icon on initial play if video is muted
  if (videoElement.readyState < 3 && isMuted) return;

  const overlay = createMuteIconOverlay(isMuted);
  videoElement.parentElement.appendChild(overlay);
  void overlay.offsetWidth;
  overlay.classList.add("show");

  // Only auto-hide if it's a click event (not hover)
  if (videoElement.readyState >= 3 && !videoElement.paused) {
    setTimeout(() => {
      // Only remove if it's still the same overlay (hasn't been removed by hover out)
      if (overlay.parentNode) {
        overlay.classList.remove("show");
        setTimeout(() => {
          if (overlay.parentNode) overlay.remove();
        }, 1500);
      }
    }, 1500);
  } else {
    const onPlay = () => {
      if (overlay.parentNode) {
        void overlay.offsetWidth;
        overlay.classList.add("show");
        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.classList.remove("show");
            setTimeout(() => {
              if (overlay.parentNode) overlay.remove();
            }, 1500);
          }
        }, 1500);
      }
      videoElement.removeEventListener("playing", onPlay);
    };
    videoElement.addEventListener("playing", onPlay);
  }
}

/**
 * Creates either an `<img>` or a `<video>` element (wrapped in a `div`) for the lightbox.
 * Sets up appropriate attributes, event listeners for videos (mute, spinner, hover effects).
 * @param {'image' | 'video'} type - The type of media element to create.
 * @param {string} src - The source URL for the media.
 * @param {string | null} [posterUrl=null] - Optional poster URL for videos.
 * @returns {HTMLElement | null} The created media element (or wrapper for video), or null on failure.
 */
function createLightboxMediaElement(type, src, posterUrl = null) {
  if (type === "image") {
    const imgElement = createEl("img");
    imgElement.alt = "Project Lightbox Image";
    imgElement.src = src;
    // Prevent clicks on the image from closing the lightbox
    imgElement.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    return imgElement;
  } else if (type === "video") {
    const videoElement = createEl("video");
    videoElement.alt = "Project Lightbox Video";
    videoElement.controls = false;
    videoElement.autoplay = true;
    videoElement.loop = true;
    videoElement.setAttribute("playsinline", "");
    videoElement.setAttribute("disablePictureInPicture", "");
    if (isDesktop()) {
      videoElement.muted = userPrefersMuted;
      if (userPrefersMuted) videoElement.setAttribute("muted", "");
      else videoElement.removeAttribute("muted");
    } else {
      videoElement.muted = true;
      videoElement.setAttribute("muted", "");
    }
    videoElement.src = src;
    if (posterUrl) videoElement.poster = posterUrl;

    const wrapper = document.createElement("div");
    wrapper.className = "video-outer-wrapper";
    wrapper.style.position = "relative";
    wrapper.style.display = "inline-block";
    wrapper.style.flexGrow = "0";
    wrapper.style.flexShrink = "0";
    wrapper.style.maxHeight = "100%";
    wrapper.style.maxWidth = "100%";
    wrapper.style.verticalAlign = "middle";
    wrapper.appendChild(videoElement);

    const spinner = createSpinnerOverlay();
    wrapper.appendChild(spinner);
    let hasPlayed = false;
    function hideSpinner() {
      if (spinner.parentNode) spinner.parentNode.removeChild(spinner);
    }
    videoElement.addEventListener("playing", () => {
      hasPlayed = true;
      hideSpinner();
      showMuteIconOverlay(videoElement, videoElement.muted);
    });
    setTimeout(() => {
      if (!hasPlayed) hideSpinner();
    }, 8000);
    videoElement.addEventListener("click", (e) => {
      e.stopPropagation();
      videoElement.muted = !videoElement.muted;
      if (videoElement.muted) videoElement.setAttribute("muted", "");
      else videoElement.removeAttribute("muted");
      if (isDesktop()) {
        userPrefersMuted = videoElement.muted;
        if (window.sessionStorage)
          sessionStorage.setItem("projectsUserPrefersMuted", userPrefersMuted);
      }
      if (hasPlayed) showMuteIconOverlay(videoElement, videoElement.muted);
    });
    if (!isTouchDevice()) {
      let fadeOutTimeout = null;
      wrapper.addEventListener("mouseenter", () => {
        if (fadeOutTimeout) clearTimeout(fadeOutTimeout);
        showMuteIconOverlay(videoElement, videoElement.muted);
      });
      wrapper.addEventListener("mouseleave", () => {
        if (fadeOutTimeout) clearTimeout(fadeOutTimeout);
        fadeOutTimeout = setTimeout(() => {
          const overlay = wrapper.querySelector(".mute-icon-overlay");
          if (overlay) {
            overlay.classList.remove("show");
            setTimeout(() => {
              if (overlay.parentNode) overlay.remove();
            }, 200);
          }
        }, 2000);
      });
      videoElement.addEventListener("volumechange", () => {
        if (wrapper.matches(":hover"))
          showMuteIconOverlay(videoElement, videoElement.muted);
      });
    }
    return wrapper;
  }
  return null;
}

/**
 * Updates the content of the `#lightbox-details` element.
 * This is primarily used for displaying title/description on mobile when overlays are not used,
 * or as a fallback. Desktop typically uses `createDesktopDescriptionCard`.
 * @param {string} title - The project title.
 * @param {string} description - The project description.
 */
function updateLightboxDetails(title, description) {
  if (!lightboxDetailsEl) return;
  clearChildren(lightboxDetailsEl);
  if (title) {
    lightboxDetailsEl.appendChild(createEl("div", null, title)).id =
      "lightbox-title";
  }
  if (description && !isDesktop()) {
    const descEl = createEl("div", null, description);
    descEl.id = "lightbox-description";
    lightboxDetailsEl.appendChild(descEl);
  }
}

/**
 * Gets or creates the `.lightbox-media-wrapper` div within `#lightbox-content`.
 * This wrapper is used to contain the media element and the desktop description card.
 * @returns {HTMLElement | null} The media wrapper element, or null if `#lightboxContentEl` is not found.
 */
function getOrCreateWrapper() {
  if (!lightboxContentEl) return null;
  let wrapper = lightboxContentEl.querySelector(".lightbox-media-wrapper");
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.className = "lightbox-media-wrapper";
    lightboxContentEl.appendChild(wrapper);
  }
  return wrapper;
}

/**
 * Sends a message to the parent window to update the state of toolbar navigation buttons
 * (next/previous) and the description toggle button.
 * State is determined by available media and user preferences.
 */
function updateToolbarNavState() {
  const hasNext = currentProjectImages && currentProjectImages.length > 1;
  const hasPrevious = currentProjectImages && currentProjectImages.length > 1;
  // const currentPostData = allProjectPostsData[currentProjectIndex] || {}; // Not used here
  // const linkType = currentPostData.projectLinkType; // Not used
  // const linkUrl = currentPostData.projectLink; // Not used

  let finalDescriptionStateForMessage = false;

  if (isDesktop()) {
    const wrapper = lightboxContentEl
      ? lightboxContentEl.querySelector(".lightbox-media-wrapper")
      : null;
    const descCardElement = wrapper
      ? wrapper.querySelector(".lightbox-desc-card")
      : null;
    if (descCardElement) {
      finalDescriptionStateForMessage =
        userPrefersDescriptionVisible &&
        !descCardElement.classList.contains("fully-hidden");
    }
  } else {
    // Mobile
    finalDescriptionStateForMessage = userPrefersDescriptionVisible;
  }

  sendMessageToParent({
    type: "lightbox-state",
    open: true,
    hasNext: hasNext,
    hasPrevious: hasPrevious,
    descriptionState: finalDescriptionStateForMessage,
    shouldDisplayDescriptionToggleButton: !isDesktop(), // New flag: true for mobile, false for desktop
  });

  // Direct communication with projects.js in the same iframe context
  if (typeof window.handleLightboxStateChange === "function") {
    window.handleLightboxStateChange(true);
  }
}

/**
 * Core function to open/navigate the lightbox to a specific project and image/video.
 * Handles media loading, transitions, description card updates, and mobile overlays.
 * @param {number} projectIdx - Index of the project in `allProjectPostsData`.
 * @param {number} imageIdx - Index of the image/video within the project's media.
 * @param {number} [direction=0] - Direction of navigation (1 for next, -1 for prev, 0 for direct open).
 *                                 Used for mobile slide animations.
 * @param {boolean} [skipFadeIn=false] - If true, skips initial fade-in animation (used for rapid nav).
 *                                      Primarily for mobile slide transitions.
 */
function _openLightboxByProjectAndImage(
  projectIdx,
  imageIdx,
  direction = 0,
  skipFadeIn = false,
) {
  if (!lightboxEl || !lightboxContentEl || !allProjectPostsData.length) return;
  if (isLightboxTransitioning && direction !== 0) {
    console.warn(
      "Lightbox transition already in progress, navigation aborted.",
    );
    return;
  }
  isLightboxTransitioning = true;

  if (projectIdx < 0) projectIdx = allProjectPostsData.length - 1;
  if (projectIdx >= allProjectPostsData.length) projectIdx = 0;
  const postData = allProjectPostsData[projectIdx];
  if (!postData) {
    console.error(
      "Lightbox: Post data not found for project index:",
      projectIdx,
    );
    isLightboxTransitioning = false;
    return;
  }

  try {
    // currentProjectImages should now be an array of objects
    let rawImages = JSON.parse(postData.images || "[]");
    if (!Array.isArray(rawImages) || rawImages.length === 0) {
      // Fallback if 'images' is empty or not an array: use main project src
      currentProjectImages = [
        {
          type: postData.type || "image",
          src: toAbsoluteAssetPath(postData.src),
          poster: postData.poster ? toAbsoluteAssetPath(postData.poster) : null,
        },
      ];
    } else {
      currentProjectImages = rawImages
        .map((item) => {
          if (typeof item === "string") {
            // Legacy format: array of strings (assume images)
            return { type: "image", src: toAbsoluteAssetPath(item) };
          } else if (typeof item === "object" && item.src) {
            // New format: array of objects
            return {
              type: item.type || "image",
              src: toAbsoluteAssetPath(item.src),
              poster: item.poster ? toAbsoluteAssetPath(item.poster) : null,
              posterMobile: item.posterMobile
                ? toAbsoluteAssetPath(item.posterMobile)
                : null,
            };
          }
          console.warn(
            "Lightbox: Invalid item in images array, skipping:",
            item,
          );
          return null; // Invalid item
        })
        .filter((item) => item !== null); // Remove any null items

      // If after processing, currentProjectImages is empty, fallback to main src
      if (currentProjectImages.length === 0) {
        currentProjectImages = [
          {
            type: postData.type || "image",
            src: toAbsoluteAssetPath(postData.src),
            poster: postData.poster
              ? toAbsoluteAssetPath(postData.poster)
              : null,
            posterMobile: postData.posterMobile
              ? toAbsoluteAssetPath(postData.posterMobile)
              : null,
          },
        ];
      }
    }
  } catch (e) {
    console.error(
      "Lightbox: Error parsing images data. Falling back to main src.",
      e,
    );
    currentProjectImages = [
      {
        type: postData.type || "image",
        src: toAbsoluteAssetPath(postData.src),
        poster: postData.poster ? toAbsoluteAssetPath(postData.poster) : null,
      },
    ];
  }

  if (imageIdx === -1) imageIdx = currentProjectImages.length - 1;
  // Ensure imageIdx is within bounds, defaulting to 0 if array is empty or index is out of range
  if (currentProjectImages.length === 0) {
    console.error(
      "Lightbox: No valid images to display for project index:",
      projectIdx,
    );
    // Potentially display an error or close lightbox, for now, we'll just not load new media
    isLightboxTransitioning = false;
    return;
  }
  if (imageIdx >= currentProjectImages.length)
    imageIdx = Math.max(0, currentProjectImages.length - 1);
  if (imageIdx < 0) imageIdx = 0;

  const oldProjectIdx = currentProjectIndex;
  currentProjectIndex = projectIdx;
  currentImageIndex = imageIdx;

  const currentMediaItem = currentProjectImages[currentImageIndex];
  if (!currentMediaItem || !currentMediaItem.src) {
    console.error(
      "Lightbox: Current media item is invalid or missing src at imageIndex:",
      currentImageIndex,
      currentMediaItem,
    );
    isLightboxTransitioning = false;
    return; // Cannot proceed without a valid media item
  }

  // --- Preload only the next/previous media items ---
  const nextIdx = (currentImageIndex + 1) % currentProjectImages.length;
  const prevIdx =
    (currentImageIndex - 1 + currentProjectImages.length) %
    currentProjectImages.length;
  const indicesToPreload = [nextIdx, prevIdx];

  indicesToPreload.forEach((idx) => {
    const item = currentProjectImages[idx];
    if (item.type === "image") {
      const img = new window.Image();
      img.src = item.src;
    } else if (item.type === "video") {
      // Only preload metadata for videos
      const vid = document.createElement("video");
      vid.preload = "metadata";
      vid.src = item.src;
    }
  });

  const newMediaType = currentMediaItem.type;
  const newMediaSrc = currentMediaItem.src;
  const isMobile = !isDesktop();
  const poster =
    isMobile && currentMediaItem.posterMobile
      ? currentMediaItem.posterMobile
      : currentMediaItem.poster;

  // Title and description still come from the main postData for the project
  const title = postData.title;
  const desktopDescription = postData.description;
  const mobileDescriptionText = postData.mobileDescription;

  const wrapper = getOrCreateWrapper();
  const existingMediaElement = wrapper.querySelector(
    "img, .video-outer-wrapper",
  );
  const existingDescCardElement = wrapper.querySelector(".lightbox-desc-card");
  const isNewProjectLoad =
    oldProjectIdx === null || oldProjectIdx !== currentProjectIndex;

  // Create new media element before starting transitions
  const newMediaElement = createLightboxMediaElement(
    newMediaType,
    newMediaSrc,
    poster,
  );
  newMediaElement.style.opacity = "0";

  let oldMediaHiddenPromise = Promise.resolve();
  if (existingMediaElement) {
    oldMediaHiddenPromise = new Promise((resolve) => {
      if (skipFadeIn && !isDesktop() && direction !== 0) {
        const slideTo = direction === 1 ? "-100vw" : "100vw";
        existingMediaElement.style.transition =
          "transform 250ms cubic-bezier(0.4,0,0.2,1)";
        existingMediaElement.style.transform = `translateX(${slideTo})`;
        const onSlide = () => {
          existingMediaElement.removeEventListener("transitionend", onSlide);
          resolve();
        };
        existingMediaElement.addEventListener("transitionend", onSlide, {
          once: true,
        });
        setTimeout(onSlide, 260);
      } else {
        existingMediaElement.style.transition = "opacity 0.075s ease-out";
        existingMediaElement.style.opacity = "0";
        const onFade = () => {
          existingMediaElement.removeEventListener("transitionend", onFade);
          resolve();
        };
        existingMediaElement.addEventListener("transitionend", onFade, {
          once: true,
        });
        setTimeout(onFade, 85);
      }
    });
  }

  let oldDescCardHiddenPromise = Promise.resolve();
  if (isNewProjectLoad && existingDescCardElement) {
    oldDescCardHiddenPromise = new Promise((resolve) => {
      existingDescCardElement.style.transition = "opacity 0.15s ease-out";
      existingDescCardElement.style.opacity = "0";
      const onFade = () => {
        existingDescCardElement.removeEventListener("transitionend", onFade);
        if (existingDescCardElement.parentNode)
          existingDescCardElement.remove();
        resolve();
      };
      existingDescCardElement.addEventListener("transitionend", onFade, {
        once: true,
      });
      setTimeout(onFade, 160);
    });
  }

  Promise.all([oldMediaHiddenPromise, oldDescCardHiddenPromise])
    .then(() => {
      if (isDesktop()) {
        const currentPostData = allProjectPostsData[currentProjectIndex] || {};
        let descCardElement = wrapper.querySelector(".lightbox-desc-card");

        if (isNewProjectLoad) {
          clearChildren(wrapper);
          wrapper.appendChild(newMediaElement);
          descCardElement = createDesktopDescriptionCard(
            currentPostData.title,
            currentPostData.description,
            currentPostData.bulletPoints,
            currentPostData.toolsUsed,
            currentProjectImages.length,
            currentImageIndex,
          );
          wrapper.appendChild(descCardElement);

          wrapper.classList.remove("image-media-active", "video-media-active");
          if (newMediaType === "video")
            wrapper.classList.add("video-media-active");
          else if (newMediaType === "image")
            wrapper.classList.add("image-media-active");

          descCardElement.style.transition = "none";
          descCardElement.classList.remove(
            "desc-card-overlay-mode",
            "fully-hidden",
          );

          if (!userPrefersDescriptionVisible) {
            userPrefersDescriptionVisible = true;
          }
          descCardElement.style.opacity = "0";
          descCardElement.style.transform = "translateX(-40px)";
          void descCardElement.offsetWidth;
          descCardElement.style.transition =
            "opacity 0.25s ease-out, transform 0.25s ease-out";
          descCardElement.style.opacity = "1";
          descCardElement.style.transform = "translateX(0px)";
          wrapper.classList.add("desc-visible");
          setTimeout(() => {
            if (descCardElement) descCardElement.style.transition = "none";
          }, 260);
        } else {
          const oldMediaDomElement = wrapper.querySelector(
            "img, .video-outer-wrapper",
          );
          if (oldMediaDomElement) {
            wrapper.removeChild(oldMediaDomElement);
          }
          wrapper.insertBefore(newMediaElement, wrapper.firstChild);

          wrapper.classList.remove("image-media-active", "video-media-active");
          if (newMediaType === "video")
            wrapper.classList.add("video-media-active");
          else if (newMediaType === "image")
            wrapper.classList.add("image-media-active");

          descCardElement.style.transition = "none";

          if (currentProjectImages.length > 1) {
            updateActiveDot(currentImageIndex);
            setNavDotsVisibility(true);
          } else {
            setNavDotsVisibility(false);
          }

          descCardElement.classList.remove(
            "desc-card-overlay-mode",
            "fully-hidden",
          );

          if (userPrefersDescriptionVisible) {
            descCardElement.classList.remove("fully-hidden");
            descCardElement.style.opacity = "1";
            descCardElement.style.transform = "translateX(0px)";
            wrapper.classList.add("desc-visible");
          } else {
            descCardElement.style.opacity = "0";
            descCardElement.style.transform = "translateX(-40px)";
            if (descCardElement.style.opacity === "0") {
              descCardElement.classList.add("fully-hidden");
            }
            wrapper.classList.remove("desc-visible");
          }
        }
      } else {
        clearChildren(wrapper);
        wrapper.appendChild(newMediaElement);
        wrapper.classList.remove("image-media-active", "video-media-active");
        if (newMediaType === "video")
          wrapper.classList.add("video-media-active");
        else if (newMediaType === "image")
          wrapper.classList.add("image-media-active");
      }

      wrapper.dataset.loadedProjectIndex = projectIdx.toString();

      requestAnimationFrame(() => {
        if (skipFadeIn && !isDesktop() && direction !== 0) {
          const slideFrom = direction === 1 ? "100vw" : "-100vw";
          newMediaElement.style.transition = "none";
          newMediaElement.style.transform = `translateX(${slideFrom})`;
          newMediaElement.style.opacity = "1";

          requestAnimationFrame(() => {
            newMediaElement.style.transition =
              "transform 250ms cubic-bezier(0.4,0,0.2,1)";
            newMediaElement.style.transform = "translateX(0)";
          });
        } else {
          requestAnimationFrame(() => {
            newMediaElement.style.transition = "opacity 0.15s ease-in";
            newMediaElement.style.opacity = "1";
          });
        }

        updateLightboxDetails(
          title,
          mobileDescriptionText || desktopDescription,
        );
        if (!isDesktop()) {
          const overlayHostContainer = document.getElementById(
            "lightbox-inner-wrapper",
          );
          if (overlayHostContainer) {
            if (userPrefersDescriptionVisible)
              setTimeout(() => {
                toggleMobileOverlays(title, "show");
              }, 50);
            else
              setTimeout(() => {
                hideMobileOverlays(overlayHostContainer);
              }, 50);
          }
        }

        updateToolbarNavState();
        sendMessageToParent({
          type: "lightbox-state",
          open: true,
          hasNext: currentProjectImages.length > 1,
          hasPrevious: currentProjectImages.length > 1,
          descriptionState: userPrefersDescriptionVisible,
        });

        // Direct communication with projects.js in the same iframe context
        if (typeof window.handleLightboxStateChange === "function") {
          window.handleLightboxStateChange(true);
        }
      });
    })
    .catch((_error) => {
      if (existingMediaElement && existingMediaElement.parentNode)
        existingMediaElement.remove();
    })
    .finally(() => {
      isLightboxTransitioning = false;
    });

  // After navigation, update nav dots if overlay is visible
  setTimeout(() => updateMobileNavDots(imageIdx), 100);
}

/**
 * Updates the 'active' class on desktop navigation dots.
 * @param {number} imageIdx - The index of the currently active image/video.
 */
function updateActiveDot(imageIdx) {
  const descCard = lightboxContentEl.querySelector(".lightbox-desc-card");
  if (!descCard) return; // Guard against missing card
  const dotsContainer = descCard.querySelector(".lightbox-nav-dots");
  if (!dotsContainer) return;

  const dots = dotsContainer.querySelectorAll(".lightbox-nav-dot");
  dots.forEach((dot, idx) => {
    if (idx === imageIdx) {
      dot.classList.add("active");
    } else {
      dot.classList.remove("active");
    }
  });
}

/**
 * Shows or hides the desktop navigation dots container.
 * @param {boolean} visible - True to show, false to hide.
 */
function setNavDotsVisibility(visible) {
  const descCard = lightboxContentEl.querySelector(".lightbox-desc-card");
  if (!descCard) return; // Guard against missing card
  const dotsContainer = descCard.querySelector(".lightbox-nav-dots");
  if (dotsContainer) {
    dotsContainer.style.display = visible ? "flex" : "none";
  }
}

/**
 * Navigates to the next image/video in the current project.
 * Wraps around to the first item if at the end.
 * Internal helper, typically called by API or gesture handlers.
 */
function _navigateNext() {
  if (
    currentProjectIndex === null ||
    !allProjectPostsData[currentProjectIndex] ||
    currentProjectImages.length === 0
  )
    return;
  if (currentImageIndex < currentProjectImages.length - 1) currentImageIndex++;
  else currentImageIndex = 0;
  _openLightboxByProjectAndImage(
    currentProjectIndex,
    currentImageIndex,
    1,
    true,
  );
}

/**
 * Navigates to the previous image/video in the current project.
 * Wraps around to the last item if at the beginning.
 * Internal helper, typically called by API or gesture handlers.
 */
function _navigatePrevious() {
  if (
    currentProjectIndex === null ||
    !allProjectPostsData[currentProjectIndex] ||
    currentProjectImages.length === 0
  )
    return;
  if (currentImageIndex > 0) currentImageIndex--;
  else currentImageIndex = currentProjectImages.length - 1;
  _openLightboxByProjectAndImage(
    currentProjectIndex,
    currentImageIndex,
    -1,
    true,
  );
}

/**
 * Closes the lightbox with a fade-out animation and performs cleanup.
 * Resets state variables and informs the parent window.
 * Internal helper, typically called by API, Escape key, or click-outside.
 */
function _closeLightbox() {
  if (!lightboxEl || !lightboxContentEl) return;
  const thisCloseGeneration = lightboxOpenGeneration;
  lightboxEl.classList.remove("fade-in");
  lightboxEl.classList.add("fade-out");

  let transitionEnded = false;
  // Assign to the broader scoped variable
  onLightboxCloseTransitionEnd = (e) => {
    if (thisCloseGeneration !== lightboxOpenGeneration) return; // Ignore if a new open happened
    if (e.target === lightboxEl && e.propertyName === "opacity") {
      transitionEnded = true;
      lightboxEl.style.display = "none";
      lightboxEl.classList.remove("fade-out");
      lightboxEl.removeEventListener(
        "transitionend",
        onLightboxCloseTransitionEnd,
      );
      lightboxEl.style.visibility = "hidden";
      lightboxEl.style.opacity = "";
      if (lightboxContentEl) lightboxContentEl.style.opacity = "";
      if (closeLightboxTimeoutId) {
        clearTimeout(closeLightboxTimeoutId);
        closeLightboxTimeoutId = null;
      }
      onLightboxCloseTransitionEnd = null; // Clear the handler itself after use
    }
  };
  lightboxEl.addEventListener("transitionend", onLightboxCloseTransitionEnd);

  // Clear any existing timeout before setting a new one
  if (closeLightboxTimeoutId) {
    clearTimeout(closeLightboxTimeoutId);
  }
  closeLightboxTimeoutId = setTimeout(() => {
    if (thisCloseGeneration !== lightboxOpenGeneration) return; // Ignore if a new open happened
    if (!transitionEnded && lightboxEl.classList.contains("fade-out")) {
      lightboxEl.style.display = "none";
      lightboxEl.classList.remove("fade-out");
      if (onLightboxCloseTransitionEnd) {
        // Check if listener still exists
        lightboxEl.removeEventListener(
          "transitionend",
          onLightboxCloseTransitionEnd,
        );
        onLightboxCloseTransitionEnd = null;
      }
      lightboxEl.style.visibility = "hidden";
      lightboxEl.style.opacity = "";
      if (lightboxContentEl) lightboxContentEl.style.opacity = "";
    }
    closeLightboxTimeoutId = null; // Clear the ID after execution
  }, 300);

  const mediaElement = lightboxContentEl.querySelector("video, img");
  if (mediaElement && mediaElement.tagName === "VIDEO") {
    mediaElement.pause();
    mediaElement.removeAttribute("src");
    mediaElement.load();
  }
  clearChildren(lightboxContentEl);
  if (lightboxDetailsEl) clearChildren(lightboxDetailsEl);
  document.body.style.overflow = "";
  sendMessageToParent({ type: "set-home-enabled", enabled: false });
  lightboxEl
    .querySelectorAll(".lightbox-title-overlay, .lightbox-description-overlay")
    .forEach((o) => o.remove());
  sendMessageToParent({ type: "lightbox-state", open: false });

  // Direct communication with projects.js in the same iframe context
  if (typeof window.handleLightboxStateChange === "function") {
    window.handleLightboxStateChange(false);
  }

  // Reset core state variables to ensure a fresh load next time
  currentProjectIndex = null;
  currentImageIndex = null;
  currentProjectImages = [];
  // isLightboxTransitioning is reset in _openLightboxByProjectAndImage finally block
  // userPrefersDescriptionVisible and userPrefersMuted persist in sessionStorage or globals
}

/**
 * Creates the HTML structure for a mobile overlay (title or description).
 * @param {string} text - The text content for the overlay.
 * @param {'top' | 'bottom'} [position="bottom"] - Position of the overlay ('top' for title, 'bottom' for description).
 * @returns {HTMLElement} The created overlay element.
 */
function createLightboxOverlay(text, position = "bottom") {
  const className =
    position === "top"
      ? "lightbox-title-overlay"
      : "lightbox-description-overlay";
  const overlay = createEl("div", className);
  const textSpan = createEl(
    "span",
    className === "lightbox-title-overlay" ? "lightbox-overlay-title-text" : "",
  );
  textSpan.innerHTML = text || "";
  overlay.appendChild(textSpan);

  // Insert nav dots below the title in the top overlay (mobile)
  if (
    position === "top" &&
    currentProjectImages &&
    currentProjectImages.length > 1
  ) {
    const navDots = createMobileNavDots(
      currentProjectImages.length,
      currentImageIndex,
    );
    overlay.appendChild(navDots);
  }

  return overlay;
}

/**
 * Hides any visible mobile overlays (title and/or description) with an animation.
 * Removes the overlay elements from the DOM after animation.
 * Updates user preference and informs parent window.
 * @param {HTMLElement} overlayContainer - The container element for mobile overlays (usually #lightbox-inner-wrapper).
 * @returns {boolean} True if an overlay was hidden, false otherwise.
 */
function hideMobileOverlays(overlayContainer) {
  if (!overlayContainer) return false;
  let actionPerformed = false;
  function onHideElementOnAnimationEndInternal() {
    this.removeEventListener(
      "animationend",
      onHideElementOnAnimationEndInternal,
    );
    if (this.parentNode) this.parentNode.removeChild(this);
  }
  const titleToHide = overlayContainer.querySelector(
    ".lightbox-title-overlay.show",
  );
  if (titleToHide) {
    titleToHide.style.animation = "";
    titleToHide.style.transition = "";
    titleToHide.classList.remove("show");
    titleToHide.classList.add("hide-anim");
    titleToHide.style.pointerEvents = "none";
    titleToHide.addEventListener(
      "animationend",
      onHideElementOnAnimationEndInternal,
      { once: true },
    );
    actionPerformed = true;
  }
  const descToHide = overlayContainer.querySelector(
    ".lightbox-description-overlay.show",
  );
  if (descToHide) {
    descToHide.style.animation = "";
    descToHide.style.transition = "";
    descToHide.classList.remove("show");
    descToHide.classList.add("hide-anim");
    descToHide.style.pointerEvents = "none";
    descToHide.addEventListener(
      "animationend",
      onHideElementOnAnimationEndInternal,
      { once: true },
    );
    actionPerformed = true;
  }
  if (actionPerformed) {
    userPrefersDescriptionVisible = false;
    if (window.sessionStorage)
      sessionStorage.setItem("projectsUserPrefersDescriptionVisible", "false");
    sendMessageToParent({ type: "description-state", open: false });
  }
  return actionPerformed;
}

/**
 * Toggles the visibility of mobile overlays (title and description).
 * Can explicitly show or hide, or toggle based on current state.
 * @param {string} titleText - The title text for the top overlay.
 * @param {'toggle' | 'show' | 'hide'} [command='toggle'] - Action to perform.
 */
function toggleMobileOverlays(titleText, command = "toggle") {
  const overlayContainer = document.getElementById("lightbox-inner-wrapper");
  if (!overlayContainer || isDesktop()) return;
  const handleOverlayTap = function (event) {
    event.stopPropagation();
    hideMobileOverlays(overlayContainer);
  };
  const titleOverlayCurrentlyVisible = overlayContainer.querySelector(
    ".lightbox-title-overlay.show",
  );
  const descOverlayCurrentlyVisible = overlayContainer.querySelector(
    ".lightbox-description-overlay.show",
  );
  const anyOverlayCurrentlyVisible =
    titleOverlayCurrentlyVisible || descOverlayCurrentlyVisible;
  let shouldShowOverlays =
    command === "toggle" ? !anyOverlayCurrentlyVisible : command === "show";

  if (shouldShowOverlays) {
    let titleOverlay = overlayContainer.querySelector(
      ".lightbox-title-overlay",
    );
    if (!titleOverlay || !titleOverlay.classList.contains("show")) {
      if (titleOverlay) titleOverlay.remove();
      titleOverlay = createLightboxOverlay(titleText, "top");
      overlayContainer.appendChild(titleOverlay);
      void titleOverlay.offsetWidth;
      titleOverlay.classList.remove("hide-anim");
      titleOverlay.classList.add("show");
      titleOverlay.style.pointerEvents = "auto";
    }
    if (titleOverlay) {
      titleOverlay.removeEventListener("click", handleOverlayTap);
      titleOverlay.addEventListener("click", handleOverlayTap);
    }
    let descOverlay = overlayContainer.querySelector(
      ".lightbox-description-overlay",
    );
    const currentPostDataForOverlay =
      allProjectPostsData[currentProjectIndex] || {};
    const actualDescriptionForOverlay =
      currentPostDataForOverlay.mobileDescription ||
      currentPostDataForOverlay.description ||
      "";
    if (!descOverlay || !descOverlay.classList.contains("show")) {
      if (descOverlay) descOverlay.remove();
      descOverlay = createLightboxOverlay(
        actualDescriptionForOverlay,
        "bottom",
      );
      overlayContainer.appendChild(descOverlay);
      void descOverlay.offsetWidth;
      descOverlay.classList.remove("hide-anim");
      descOverlay.classList.add("show");
      descOverlay.style.pointerEvents = "auto";
    }
    if (descOverlay) {
      descOverlay.removeEventListener("click", handleOverlayTap);
      descOverlay.addEventListener("click", handleOverlayTap);
    }
    const nowVisibleTitle = overlayContainer.querySelector(
      ".lightbox-title-overlay.show",
    );
    const nowVisibleDesc = overlayContainer.querySelector(
      ".lightbox-description-overlay.show",
    );
    if (nowVisibleTitle || nowVisibleDesc) {
      if (!userPrefersDescriptionVisible) {
        userPrefersDescriptionVisible = true;
        if (window.sessionStorage)
          sessionStorage.setItem(
            "projectsUserPrefersDescriptionVisible",
            "true",
          );
        sendMessageToParent({ type: "description-state", open: true });
      }
    }
    // Always update nav dots in the top overlay after showing overlays
    updateMobileNavDots(currentImageIndex);
  } else {
    if (anyOverlayCurrentlyVisible) hideMobileOverlays(overlayContainer);
  }
}

/**
 * Toggles the visibility of the desktop description card with an animation.
 * Updates user preference and informs the parent window.
 * @param {HTMLElement} wrapper - The `.lightbox-media-wrapper` element containing the card.
 */
function toggleDesktopDescriptionOverlay(wrapper) {
  if (!wrapper || !isDesktop()) return;

  let descCardElement = wrapper.querySelector(".lightbox-desc-card");

  // Determine intent based on current actual visibility, not just preference for overlay cards
  let intentToShow = !userPrefersDescriptionVisible; // Simplified assignment

  // Create card if it doesn't exist and we intend to show it
  if (!descCardElement && intentToShow) {
    const currentPostData = allProjectPostsData[currentProjectIndex] || {};
    descCardElement = createDesktopDescriptionCard(
      currentPostData.title,
      currentPostData.description,
      currentPostData.bulletPoints,
      currentPostData.toolsUsed,
      currentProjectImages.length,
      currentImageIndex,
    );
    wrapper.appendChild(descCardElement);

    descCardElement.style.transition = "none";
    descCardElement.classList.remove("fully-hidden");

    descCardElement.classList.remove("desc-card-overlay-mode");
    descCardElement.style.opacity = "0";
    descCardElement.style.transform = "translateX(-40px)";
    descCardElement.classList.add("fully-hidden");
    void descCardElement.offsetWidth; // Reflow
  }

  if (!descCardElement) return;

  if (intentToShow) {
    // --- INTENT TO SHOW ---
    userPrefersDescriptionVisible = true;
    wrapper.classList.add("desc-visible");

    descCardElement.classList.remove("fully-hidden");
    void descCardElement.offsetWidth;
    descCardElement.style.transition =
      "opacity 0.25s ease-out, transform 0.25s ease-out";
    descCardElement.style.opacity = "1";
    descCardElement.style.transform = "translateX(0px)";
  } else {
    // --- INTENT TO HIDE ---
    userPrefersDescriptionVisible = false;
    wrapper.classList.remove("desc-visible");

    descCardElement.style.transition =
      "opacity 0.25s ease-out, transform 0.25s ease-out";
    descCardElement.style.opacity = "0";
    descCardElement.style.transform = "translateX(-40px)";
    setTimeout(() => {
      if (descCardElement && descCardElement.style.opacity === "0") {
        descCardElement.classList.add("fully-hidden");
      }
    }, 260);
  }

  if (window.sessionStorage) {
    sessionStorage.setItem(
      "projectsUserPrefersDescriptionVisible",
      userPrefersDescriptionVisible.toString(),
    );
  }
  // Send the description-state message immediately based on the intent, not delayed by animation.
  sendMessageToParent({ type: "description-state", open: intentToShow });

  setTimeout(() => {
    if (descCardElement) descCardElement.style.transition = "none";
  }, 260);
}

/**
 * Throttles navigation button actions (next/previous).
 * Prevents rapid calls and sends messages to parent to temporarily disable/re-enable toolbar buttons.
 */
function throttleNavigationButtons() {
  isNavigationThrottled = true;
  sendMessageToParent({ type: "throttle-nav-buttons", active: true });
  setTimeout(() => {
    isNavigationThrottled = false;
    sendMessageToParent({ type: "throttle-nav-buttons", active: false });
    if (lightboxEl && lightboxEl.style.display === "flex")
      updateToolbarNavState();
  }, NAVIGATION_THROTTLE_DURATION);
}

// --- Touch Gesture Handling ---
/** @type {number} X-coordinate at the start of a touch drag. */
let dragStartX = 0,
  dragCurrentX = 0,
  dragStartY = 0,
  dragCurrentY = 0;
/** @type {boolean} True if a touch drag is currently in progress. */
let dragging = false,
  dragHasMoved = false,
  dragRAF = null,
  dragIsVertical = false;

/**
 * Applies CSS transforms to `#lightboxContentEl` for swipe effects (translate, scale).
 * Also adjusts opacity for vertical swipe-to-close gestures.
 * @param {number} dx - Horizontal translation in pixels.
 * @param {number} dy - Vertical translation in pixels.
 * @param {number} [scale=1] - Scale factor.
 * @param {boolean} [isDownwardHintSwipe=false] - True if it's a short downward swipe (hinting at close).
 */
function setSwipeContentTransform(
  dx,
  dy,
  scale = 1,
  isDownwardHintSwipe = false,
) {
  if (!lightboxContentEl) return;
  const media = lightboxContentEl.querySelector(
    "img, video, .video-outer-wrapper",
  );
  const overlayHost = document.getElementById("lightbox-inner-wrapper");
  const titleOverlay = overlayHost?.querySelector(
    ".lightbox-title-overlay.show",
  );
  const descOverlay = overlayHost?.querySelector(
    ".lightbox-description-overlay.show",
  );
  let finalScale = scale;
  if (media) media.style.opacity = "";
  if (lightboxEl) lightboxEl.style.opacity = "";
  if (titleOverlay) titleOverlay.style.transition = "none";
  if (descOverlay) descOverlay.style.transition = "none";

  if (media && dragIsVertical) {
    if (!isDownwardHintSwipe && dy < 0) {
      const fadeEnd = 0.95,
        dragRatio = Math.min(1, Math.abs(dy) / (window.innerHeight * fadeEnd)),
        fade = 1 - Math.pow(dragRatio, 2);
      media.style.opacity = fade;
      if (lightboxEl) lightboxEl.style.opacity = fade;
      if (titleOverlay) titleOverlay.style.opacity = fade;
      if (descOverlay) descOverlay.style.opacity = fade;
      finalScale = 1 - (1 - 0.25) * dragRatio;
    } else if (isDownwardHintSwipe && dy > 0) {
      const hintDragRatio = Math.min(1, dy / 40),
        hintOverlayOpacity = 1 - hintDragRatio * 0.5;
      if (titleOverlay) titleOverlay.style.opacity = hintOverlayOpacity;
      if (descOverlay) descOverlay.style.opacity = hintOverlayOpacity;
    }
  }
  if (lightboxContentEl)
    lightboxContentEl.style.transform = `translateX(${dx}px) translateY(${dy}px) scale(${finalScale})`;
}

/**
 * Handles the `touchstart` event for swipe gestures.
 * Initializes drag state variables.
 * @param {TouchEvent} e - The touch event.
 */
function handleTouchStart(e) {
  if (e.touches.length !== 1 || !lightboxContentEl) return;
  dragStartX = e.touches[0].clientX;
  dragCurrentX = dragStartX;
  dragStartY = e.touches[0].clientY;
  dragCurrentY = dragStartY;
  dragging = true;
  dragHasMoved = false;
  dragIsVertical = false;
  lightboxContentEl.classList.add("swiping");
  lightboxContentEl.classList.remove("animate");
  const overlayHost = document.getElementById("lightbox-inner-wrapper");
  const titleOverlay = overlayHost?.querySelector(
    ".lightbox-title-overlay.show",
  );
  const descOverlay = overlayHost?.querySelector(
    ".lightbox-description-overlay.show",
  );
  if (titleOverlay) {
    titleOverlay.style.opacity = "1";
    titleOverlay.style.animation = "none";
    titleOverlay.style.transition = "none";
  }
  if (descOverlay) {
    descOverlay.style.opacity = "1";
    descOverlay.style.animation = "none";
    descOverlay.style.transition = "none";
  }
}

/**
 * Handles the `touchmove` event for swipe gestures.
 * Updates drag coordinates, determines drag direction (vertical/horizontal),
 * and applies transforms using `requestAnimationFrame`.
 * @param {TouchEvent} e - The touch event.
 */
function handleTouchMove(e) {
  if (!dragging || e.touches.length !== 1 || !lightboxContentEl) return;
  dragCurrentX = e.touches[0].clientX;
  dragCurrentY = e.touches[0].clientY;
  const dx = dragCurrentX - dragStartX,
    dy = dragCurrentY - dragStartY;

  // Increase the threshold for considering it a drag vs a tap
  if (Math.abs(dx) > 8 || Math.abs(dy) > 8) dragHasMoved = true;

  if (!dragIsVertical && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12)
    dragIsVertical = true;
  else if (!dragIsVertical && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 12)
    dragIsVertical = false;

  if (dragRAF) cancelAnimationFrame(dragRAF);

  if (!dragIsVertical) {
    dragRAF = requestAnimationFrame(() =>
      setSwipeContentTransform(dx, 0, 1, false),
    );
  } else {
    let effectiveDy = dy,
      scaleToApply = 1,
      isHintSwipe = false;
    if (dy < 0)
      scaleToApply =
        1 +
        (0.85 - 1) *
          Math.min(1, Math.abs(effectiveDy) / (window.innerHeight / 2));
    else if (dy > 0) {
      effectiveDy = Math.min(dy, 40);
      isHintSwipe = true;
    } else effectiveDy = 0;
    dragRAF = requestAnimationFrame(() =>
      setSwipeContentTransform(0, effectiveDy, scaleToApply, isHintSwipe),
    );
  }
}

/**
 * Handles the `touchend` event for swipe gestures.
 * Determines if a swipe action (navigate next/prev, close) should be triggered
 * or if the content should snap back to its original position.
 * @param {TouchEvent} e - The touch event.
 */
function handleTouchEnd(e) {
  if (!dragging || !lightboxContentEl) return;
  dragging = false;
  if (dragRAF) cancelAnimationFrame(dragRAF);
  const dx = dragCurrentX - dragStartX,
    dy = dragCurrentY - dragStartY;
  const media = lightboxContentEl.querySelector(
    "img, video, .video-outer-wrapper",
  );

  if (!dragHasMoved) {
    let tappedOnMediaContent = false;
    if (media) {
      const mediaElementItself = media.matches("img, video")
        ? media
        : media.querySelector("video");
      if (
        mediaElementItself &&
        e.target.closest(
          ".mute-icon-overlay, .video-spinner-overlay, video, img",
        ) === mediaElementItself.closest(".video-outer-wrapper, img")
      ) {
        tappedOnMediaContent = true;
      }
    }
    if (tappedOnMediaContent) {
      if (e) e.stopPropagation();
      lightboxContentEl.style.transform =
        "translateX(0) translateY(0) scale(1)";
      return;
    }
    lightboxContentEl.style.transform = "translateX(0) translateY(0) scale(1)";
    return;
  }

  let triggerSwipeUp = false,
    triggerSwipeLeft = false,
    triggerSwipeRight = false;
  const canNavigateProject =
    currentProjectImages && currentProjectImages.length > 1;

  if (media) {
    const rect = media.getBoundingClientRect();
    if (
      dragIsVertical &&
      Math.abs(dy) > MIN_SWIPE_DISTANCE &&
      rect.bottom + dy < window.innerHeight / 2 &&
      Math.abs(dy) > Math.abs(dx)
    )
      triggerSwipeUp = true;
    if (!triggerSwipeUp && canNavigateProject) {
      if (
        !dragIsVertical &&
        Math.abs(dx) > MIN_SWIPE_DISTANCE &&
        rect.right + dx < window.innerWidth / 2 &&
        dx < 0 &&
        Math.abs(dx) > Math.abs(dy)
      )
        triggerSwipeLeft = true;
      else if (
        !dragIsVertical &&
        Math.abs(dx) > MIN_SWIPE_DISTANCE &&
        rect.left + dx > window.innerWidth / 2 &&
        dx > 0 &&
        Math.abs(dx) > Math.abs(dy)
      )
        triggerSwipeRight = true;
    }
  }

  if (triggerSwipeUp) {
    lightboxContentEl.classList.remove("swiping");
    lightboxContentEl.classList.add("animate");
    const targetY = -window.innerHeight,
      duration = 400,
      minScale = 0.25;
    lightboxContentEl.style.transition = `transform ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
    lightboxContentEl.style.transform = `translateY(${targetY}px) scale(${minScale})`;
    if (lightboxEl)
      lightboxEl.style.transition = `opacity ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
    if (lightboxEl) lightboxEl.style.opacity = 0;
    if (media)
      media.style.transition = `opacity ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
    if (media) media.style.opacity = 0;
    const onTransitionEnd = () => {
      lightboxContentEl.removeEventListener("transitionend", onTransitionEnd);
      lightboxContentEl.classList.remove("animate");
      lightboxContentEl.style.transition = "";
      lightboxContentEl.style.transform =
        "translateX(0) translateY(0) scale(1)";
      if (lightboxEl) lightboxEl.style.transition = "";
      if (lightboxEl) lightboxEl.style.opacity = "";
      if (media) {
        media.style.transition = "";
        media.style.opacity = "";
      }
      _closeLightbox();
    };
    lightboxContentEl.addEventListener("transitionend", onTransitionEnd);
    return;
  }

  if (triggerSwipeLeft || triggerSwipeRight) {
    const targetX = triggerSwipeLeft ? -window.innerWidth : window.innerWidth;
    const duration = 400;
    const currentMedia = lightboxContentEl.querySelector(
      "img, .video-outer-wrapper",
    );
    lightboxContentEl.classList.add("animate");
    lightboxContentEl.style.transition = `transform ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
    lightboxContentEl.style.transform = `translateX(${targetX}px)`;
    if (lightboxEl) lightboxEl.style.transition = "";
    if (lightboxEl) lightboxEl.style.opacity = "";
    const onTransitionEnd = () => {
      lightboxContentEl.removeEventListener("transitionend", onTransitionEnd);
      lightboxContentEl.classList.remove("animate");
      if (currentMedia && currentMedia.parentNode)
        currentMedia.parentNode.removeChild(currentMedia);
      lightboxContentEl.style.transition = "none";
      lightboxContentEl.style.transform = "translateX(0)";
      void lightboxContentEl.offsetWidth;
      lightboxContentEl.style.transition = "";
      if (triggerSwipeLeft) _navigateNext();
      else _navigatePrevious();
    };
    lightboxContentEl.addEventListener("transitionend", onTransitionEnd);
    return;
  }

  // Snap back
  lightboxContentEl.classList.remove("swiping");
  lightboxContentEl.classList.add("animate");
  lightboxContentEl.style.transition = `transform 500ms cubic-bezier(0.175, 0.885, 0.32, 1.275)`;
  lightboxContentEl.style.transform = "translateX(0) translateY(0) scale(1)";
  if (media) {
    media.style.transition = "";
    media.style.opacity = "";
  }
  if (lightboxEl) lightboxEl.style.transition = "";
  if (lightboxEl) lightboxEl.style.opacity = "";
  const overlayHost = document.getElementById("lightbox-inner-wrapper");
  if (overlayHost) {
    const titleOverlay = overlayHost.querySelector(".lightbox-title-overlay");
    const descOverlay = overlayHost.querySelector(
      ".lightbox-description-overlay",
    );
    const resetOverlay = (overlay) => {
      if (overlay) {
        overlay.style.transition = "none";
        overlay.style.animation = "";
        if (
          overlay.classList.contains("show") &&
          !overlay.classList.contains("hide-anim")
        ) {
          overlay.style.opacity = "1";
          overlay.style.transform = "translateY(0px)";
        } else {
          overlay.style.opacity = "";
          overlay.style.transform = "";
        }
        requestAnimationFrame(() => {
          if (overlay) overlay.style.transition = "";
        });
      }
    };
    resetOverlay(titleOverlay);
    resetOverlay(descOverlay);
  }
  const onSnapBackEnd = (event) => {
    if (
      event.target === lightboxContentEl &&
      event.propertyName === "transform"
    ) {
      lightboxContentEl.removeEventListener("transitionend", onSnapBackEnd);
      lightboxContentEl.style.transition = "";
      lightboxContentEl.classList.remove("animate");
    }
  };
  lightboxContentEl.addEventListener("transitionend", onSnapBackEnd);
}

// Helper to create nav dots for mobile overlay (with navigation logic)
/**
 * Creates navigation dots for mobile overlays.
 * Includes event listeners for navigating when a dot is clicked/activated.
 * @param {number} count - Total number of media items (dots to create).
 * @param {number} activeIdx - Index of the currently active media item.
 * @returns {HTMLElement} The container element with navigation dots.
 */
function createMobileNavDots(count, activeIdx) {
  const dotsContainer = createEl("div", "mobile-lightbox-nav-dots");
  for (let i = 0; i < count; i++) {
    const dot = createEl("span", "mobile-lightbox-nav-dot");
    if (i === activeIdx) dot.classList.add("active");
    dot.dataset.index = i;
    // Add navigation event listeners
    dot.addEventListener("click", (event) => {
      event.stopPropagation();
      const targetIndex = parseInt(dot.dataset.index, 10);
      if (
        targetIndex !== currentImageIndex &&
        !isLightboxTransitioning &&
        !isNavigationThrottled
      ) {
        _openLightboxByProjectAndImage(
          currentProjectIndex,
          targetIndex,
          0,
          false,
        );
      }
    });
    dot.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const targetIndex = parseInt(dot.dataset.index, 10);
        if (
          targetIndex !== currentImageIndex &&
          !isLightboxTransitioning &&
          !isNavigationThrottled
        ) {
          _openLightboxByProjectAndImage(
            currentProjectIndex,
            targetIndex,
            0,
            false,
          );
        }
      }
    });
    dotsContainer.appendChild(dot);
  }
  return dotsContainer;
}

// Helper to update nav dots in the top overlay
/**
 * Updates the 'active' class on mobile navigation dots within the currently visible top overlay.
 * @param {number} activeIdx - Index of the currently active media item.
 */
function updateMobileNavDots(activeIdx) {
  const overlay = document.querySelector(".lightbox-title-overlay.show");
  if (!overlay) return;
  const dots = overlay.querySelectorAll(".mobile-lightbox-nav-dot");
  dots.forEach((dot, idx) => {
    if (idx === activeIdx) dot.classList.add("active");
    else dot.classList.remove("active");
  });
}

// ===== Lightbox API =====
/**
 * @namespace Lightbox
 * @description Public API for controlling the lightbox.
 */
window.Lightbox = {
  /**
   * Initializes the lightbox. Must be called once before other API methods.
   * Sets up DOM element references, loads user preferences, and attaches global event listeners.
   * @param {Array<Object>} projectPostsData - Array of all project data objects.
   */
  init: (projectPostsData) => {
    allProjectPostsData = projectPostsData;
    lightboxEl = document.getElementById("project-lightbox");
    lightboxContentEl = document.getElementById("lightbox-content");
    lightboxDetailsEl = document.getElementById("lightbox-details");

    if (!lightboxEl || !lightboxContentEl || !lightboxDetailsEl) {
      console.error(
        "Lightbox DOM elements not found during init! Ensure HTML is loaded.",
      );
      return;
    }

    // Load user preferences from sessionStorage if available
    if (window.sessionStorage) {
      // Mute preference
      if (sessionStorage.getItem("projectsUserPrefersMuted") !== null) {
        userPrefersMuted =
          sessionStorage.getItem("projectsUserPrefersMuted") === "true";
      }
      // Description visibility preference
      const storedDescPref = sessionStorage.getItem(
        "projectsUserPrefersDescriptionVisible",
      );
      if (storedDescPref !== null) {
        userPrefersDescriptionVisible = storedDescPref === "true";
      } else {
        // If no preference stored, default based on device type and store it
        userPrefersDescriptionVisible = isDesktop();
        sessionStorage.setItem(
          "projectsUserPrefersDescriptionVisible",
          userPrefersDescriptionVisible.toString(),
        );
      }
    } else {
      // Session storage not available, use default based on device for this session only
      userPrefersDescriptionVisible = isDesktop();
    }

    // Event listeners
    lightboxEl.addEventListener("click", (event) => {
      const clickedElement = event.target;

      // Define what constitutes an "internal" click that should NOT close the lightbox
      const isMediaWrapperClick = clickedElement.closest(
        ".lightbox-media-wrapper",
      );
      const isDescCardClick = clickedElement.closest(".lightbox-desc-card"); // Desktop desc card
      const isMobileTitleOverlayClick = clickedElement.closest(
        ".lightbox-title-overlay",
      );
      const isMobileDescOverlayClick = clickedElement.closest(
        ".lightbox-description-overlay",
      );
      // Add other specific interactive elements that are part of the "background" but shouldn't close it
      const isLightboxContentItself =
        clickedElement.closest("#lightbox-content");
      const isLightboxInnerWrapperItself = clickedElement.closest(
        "#lightbox-inner-wrapper",
      );

      const isInsideContent =
        isMediaWrapperClick ||
        isDescCardClick ||
        isMobileTitleOverlayClick ||
        isMobileDescOverlayClick;

      // If the click was on the lightboxEl itself, or on one of its main structural children
      // that isn't the actual displayed media/description content, then consider it a background click.
      const isBackgroundClick =
        clickedElement === lightboxEl ||
        (isLightboxContentItself && !isInsideContent) ||
        (isLightboxInnerWrapperItself && !isInsideContent);

      // Close the lightbox if the click is considered a background click
      // and not on any of the defined content areas.
      if (isBackgroundClick && !isInsideContent) {
        _closeLightbox();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        lightboxEl &&
        lightboxEl.style.display === "flex"
      ) {
        _closeLightbox();
      }
    });

    if (lightboxContentEl) {
      lightboxContentEl.addEventListener("touchstart", handleTouchStart, {
        passive: true,
      });
      lightboxContentEl.addEventListener("touchmove", handleTouchMove, {
        passive: true,
      });
      lightboxContentEl.addEventListener("touchend", handleTouchEnd, {
        passive: true,
      });
    }
  },

  /**
   * Opens the lightbox to a specific project and image/video.
   * @param {number} projectIdx - Index of the project in `allProjectPostsData`.
   * @param {number} [imageIdx=0] - Index of the image/video within the project's media.
   */
  open: (projectIdx, imageIdx = 0) => {
    if (!lightboxEl) {
      console.error(
        "Lightbox not initialized or DOM not ready for open(). Call Lightbox.init() first.",
      );
      return;
    }

    // --- Cleanup from any previous (potentially interrupted) close operation ---
    // Clear timeout for close fallback
    if (closeLightboxTimeoutId) {
      clearTimeout(closeLightboxTimeoutId);
      closeLightboxTimeoutId = null;
    }
    // Remove any lingering transitionend listener from a previous close to prevent double execution
    if (onLightboxCloseTransitionEnd) {
      lightboxEl.removeEventListener(
        "transitionend",
        onLightboxCloseTransitionEnd,
      );
      onLightboxCloseTransitionEnd = null;
    }

    // Increment generation for this open
    lightboxOpenGeneration++;

    // Explicitly remove fade-out class and reset opacity/visibility before setting display to flex.
    // This ensures a clean state if a previous close was interrupted mid-transition.
    lightboxEl.classList.remove("fade-out");
    lightboxEl.style.opacity = ""; // Reset opacity that might have been set by fade-out
    lightboxEl.style.visibility = "hidden"; // Start hidden, then display:flex, then fade-in makes it visible
    if (lightboxContentEl) lightboxContentEl.style.opacity = ""; // Reset content opacity too
    // --- End Cleanup ---

    // Core logic to load content and set up the lightbox view
    _openLightboxByProjectAndImage(projectIdx, imageIdx, 0, false); // direction 0 for direct open, no skipFadeIn

    lightboxEl.style.display = "flex"; // Make lightbox container visible (flex layout)
    // Ensure visibility is set before starting animation for fade-in to work correctly
    lightboxEl.style.visibility = "visible";

    void lightboxEl.offsetWidth; // Trigger reflow before adding class for CSS transition
    requestAnimationFrame(() => {
      lightboxEl.classList.add("fade-in");
    }); // Add class for fade-in animation

    document.body.style.overflow = "hidden"; // Prevent scrolling on main page
    sendMessageToParent({ type: "set-home-enabled", enabled: true }); // Inform parent (e.g., disable home button)
  },

  /**
   * Navigates to the next image/video. Exposed via API.
   * Throttled to prevent rapid calls.
   */
  navigateNext: () => {
    if (isNavigationThrottled) return;
    _navigateNext();
    throttleNavigationButtons();
  },
  /**
   * Navigates to the previous image/video. Exposed via API.
   * Throttled to prevent rapid calls.
   */
  navigatePrevious: () => {
    if (isNavigationThrottled) return;
    _navigatePrevious();
    throttleNavigationButtons();
  },
  /**
   * Closes the lightbox. Exposed via API.
   */
  close: () => _closeLightbox(),
  /**
   * Toggles the visibility of the project description.
   * Behavior differs for desktop (description card) and mobile (overlays).
   * Exposed via API.
   */
  toggleDescription: () => {
    if (!lightboxContentEl) return;
    const wrapper = lightboxContentEl.querySelector(".lightbox-media-wrapper");
    if (!wrapper) return; // Media wrapper must exist

    if (isDesktop()) {
      toggleDesktopDescriptionOverlay(wrapper); // Handle desktop card
    } else {
      // For mobile, toggle overlays using the current project's title
      const postData = allProjectPostsData[currentProjectIndex] || {};
      toggleMobileOverlays(postData.title, "toggle");
    }
  },
  /**
   * Checks if the lightbox is currently open.
   * @returns {boolean} True if the lightbox is open and displayed.
   */
  isOpen: () => {
    return lightboxEl && lightboxEl.style.display === "flex";
  },
};
