/*
  projects.js — Projects App Interactivity for Windows XP Simulation
  Handles dynamic loading of project data from projects.json, masonry layout for the project feed,
  dynamic loading and initialization of lightbox.html and lightbox.js, click handling to open
  projects in the lightbox, video playback control based on visibility and window state,
  and communication with the parent window and lightbox for actions like navigation and maximized state changes.
  @file src/apps/projects/projects.js
*/

// ===== Module Imports ===== //
// import { EVENTS } from "../../scripts/utils/eventBus.js"; // Commented out as EVENTS is unused
import { isMobileDevice } from "../../scripts/utils/device.js"; // Utility to detect if the current device is mobile.

// ===== Utility Functions & Global State ===== //

/**
 * Debounces a function, ensuring it's only called after a certain delay
 * since the last time it was invoked.
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The debounce delay in milliseconds.
 * @returns {Function} The debounced function.
 */
/* // Commented out as debounce is unused
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}
*/

// Global flag to track if lightbox.html and lightbox.js have been loaded and initialized.
let lightboxDOMLoaded = false;
// Stores all project data extracted from post elements, used to initialize the lightbox.
let allPostsData = [];

/**
 * Helper function to create a DOM element with a given tag, class, and text content.
 * @param {string} tag - The HTML tag for the element.
 * @param {string} [className] - Optional CSS class name(s) for the element.
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
 * Sends a message to the parent window (main shell) if this script is running in an iframe.
 * @param {object} payload - The data to send to the parent window.
 */
function sendMessageToParent(payload) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(payload, "*");
  }
}
/**
 * Transforms a relative asset path to be absolute from the root, suitable for use within an iframe.
 * If the path is already absolute (http/https) or correctly relative for iframe context (../),
 * it's returned unchanged. Otherwise, it's prefixed with '../../../'.
 * @param {string} path - The original asset path.
 * @returns {string} The transformed asset path, or the original if no transformation is needed.
 */
function toAbsoluteAssetPath(path) {
  // Keep for feed generation
  if (!path) return path;
  if (path.startsWith("http:") || path.startsWith("https:")) return path;
  if (path.startsWith("../")) return path;
  return "../../../" + path;
}

// ===== DOMContentLoaded: Main Initialization ===== //
document.addEventListener("DOMContentLoaded", async () => {
  // Dynamically link lightbox.css to the document head.
  const lightboxCSSLink = createEl("link");
  lightboxCSSLink.rel = "stylesheet";
  lightboxCSSLink.href = "lightbox.css";
  document.head.appendChild(lightboxCSSLink);

  const feedContainer = document.querySelector(".feed-container"); // Main container for project posts.
  if (!feedContainer) {
    console.error("Feed container not found."); // Added console error
    return;
  }

  /**
   * Asynchronously loads lightbox.html, injects its content into the DOM,
   * then loads and initializes lightbox.js.
   * @returns {Promise<void>} A promise that resolves when the lightbox is loaded and initialized, or rejects on error.
   */
  async function loadAndInitLightbox() {
    if (lightboxDOMLoaded) return Promise.resolve(); // Prevent re-loading if already done.

    return new Promise((resolve, reject) => {
      // Fetch the lightbox HTML structure.
      fetch("lightbox.html")
        .then((response) => {
          if (!response.ok) {
            console.error(`Failed to load lightbox.html: ${response.status}`);
            throw new Error(`Failed to load lightbox.html: ${response.status}`);
          }
          return response.text();
        })
        .then((html) => {
          // Insert the lightbox HTML at the end of the body.
          document.body.insertAdjacentHTML("beforeend", html);

          // Create and append the lightbox.js script tag.
          const lightboxScript = createEl("script");
          lightboxScript.src = "lightbox.js";
          lightboxScript.defer = true;

          lightboxScript.onload = () => {
            if (window.Lightbox && typeof window.Lightbox.init === "function") {
              window.Lightbox.init(allPostsData);
              lightboxDOMLoaded = true;
              resolve();
            } else {
              console.error("Lightbox.init not found after lightbox.js load");
              reject(
                new Error("Lightbox.init not found after lightbox.js load"),
              );
            }
          };

          lightboxScript.onerror = () => {
            console.error("Failed to load lightbox.js script");
            reject(new Error("Failed to load lightbox.js script"));
          };

          document.head.appendChild(lightboxScript);
        })
        .catch((e) => {
          // Catches errors from fetch, response.text(), or any thrown error above
          console.error("Error in loadAndInitLightbox:", e);
          reject(e);
        });
    });
  }

  let projects = [];
  try {
    // Fetch project data from the external projects.json file.
    const response = await fetch("../../../projects.json");
    projects = await response.json();
  } catch (e) {
    console.error("Failed to load or parse projects.json", e); // Added console error
    return;
  }

  /**
   * Creates an HTML element for a single project post based on the project data.
   * This includes setting up various data attributes used by the lightbox and for styling/interaction.
   * @param {object} project - The project data object.
   * @param {number} idx - The index of the project in the projects array.
   * @returns {HTMLDivElement} The created project post element.
   */
  function createPostElement(project, idx) {
    const post = document.createElement("div");
    post.className = `post ${project.type}-post`; // Base class + type-specific class (e.g., image-post, video-post)
    post.dataset.type = project.type; // 'image' or 'video'
    post.dataset.title = project.title;

    // Array to store all media items (images/videos with sources) for the current project's lightbox display.
    const lightboxMediaItems = [];
    const mobileDevice = isMobileDevice(); // Check once for mobile-specific asset selection.

    // --- Logic for populating lightboxMediaItems and dataset attributes based on project type --- //
    if (project.type === "video") {
      // Always set dataset attributes for mobile video sources if they exist, for potential direct use by lightbox or other scripts.
      if (project.srcMobile) {
        post.dataset.srcMobile = toAbsoluteAssetPath(project.srcMobile);
      }
      if (project.fullVideoSrcMobile) {
        post.dataset.fullVideoSrcMobile = toAbsoluteAssetPath(
          project.fullVideoSrcMobile,
        );
      }
      // Set dataset.src for the grid video thumbnail, preferring mobile source if available.
      post.dataset.src =
        mobileDevice && project.srcMobile
          ? toAbsoluteAssetPath(project.srcMobile)
          : toAbsoluteAssetPath(project.src);

      // Process project.images array (additional media for lightbox) if it exists for a video project.
      if (project.images && Array.isArray(project.images)) {
        project.images.forEach((item) => {
          if (typeof item === "object" && item.src) {
            // For video projects, items in project.images are also treated as videos for lightbox consistency (or specific item.type)
            let itemType =
              item.type && item.type.toLowerCase() === "video"
                ? "video"
                : "video";
            let finalSrc =
              mobileDevice && item.srcMobile
                ? toAbsoluteAssetPath(item.srcMobile)
                : toAbsoluteAssetPath(item.src);
            lightboxMediaItems.push({
              type: itemType,
              src: finalSrc,
              poster: item.poster
                ? toAbsoluteAssetPath(item.poster)
                : project.poster
                  ? toAbsoluteAssetPath(project.poster)
                  : null,
              posterMobile: item.posterMobile
                ? toAbsoluteAssetPath(item.posterMobile)
                : project.posterMobile
                  ? toAbsoluteAssetPath(project.posterMobile)
                  : null,
            });
          }
        });
      }
      // Fallback: if no project.images were processed for a video project, use the main fullVideoSrc for the lightbox.
      if (lightboxMediaItems.length === 0 && project.fullVideoSrc) {
        let fullVideoLightboxSrc =
          mobileDevice && project.fullVideoSrcMobile
            ? toAbsoluteAssetPath(project.fullVideoSrcMobile)
            : toAbsoluteAssetPath(project.fullVideoSrc);
        lightboxMediaItems.push({
          type: "video",
          src: fullVideoLightboxSrc,
          poster: project.poster ? toAbsoluteAssetPath(project.poster) : null,
          posterMobile: project.posterMobile
            ? toAbsoluteAssetPath(project.posterMobile)
            : null,
        });
      }
    } else {
      // For "image" projects or other non-video types.
      // For non-video projects, dataset.src for grid is the main project source (no mobile variant for grid images here).
      post.dataset.src = toAbsoluteAssetPath(project.src);

      // Add the main project image/source as the first item for the lightbox.
      if (project.src) {
        lightboxMediaItems.push({
          type: project.type || "image", // Default to 'image' if type is not specified for an item.
          src: toAbsoluteAssetPath(project.src),
          poster: project.poster ? toAbsoluteAssetPath(project.poster) : null, // Poster for the main image if any.
          posterMobile: project.posterMobile
            ? toAbsoluteAssetPath(project.posterMobile)
            : null,
        });
      }

      // Process additional images/media from project.images array for the lightbox.
      if (project.images && Array.isArray(project.images)) {
        project.images.forEach((item) => {
          let itemSrc = null;
          let itemType = "image"; // Default type for items in project.images is 'image'.
          let itemPoster = null;
          let itemPosterMobile = null;

          if (typeof item === "string") {
            // If item is just a string (URL).
            itemSrc = toAbsoluteAssetPath(item);
          } else if (typeof item === "object" && item.src) {
            // If item is an object with src and optional type/poster.
            itemSrc =
              mobileDevice && item.srcMobile
                ? toAbsoluteAssetPath(item.srcMobile)
                : toAbsoluteAssetPath(item.src);
            itemType = item.type || "image"; // Use item's type or default to 'image'.
            itemPoster = item.poster ? toAbsoluteAssetPath(item.poster) : null;
            itemPosterMobile = item.posterMobile
              ? toAbsoluteAssetPath(item.posterMobile)
              : null;
          }

          if (itemSrc) {
            // Prevent adding a duplicate of the very first lightbox item (main project image) if it's also listed in project.images.
            const isDuplicateOfFirstItem =
              lightboxMediaItems.length > 0 &&
              lightboxMediaItems[0].src === itemSrc &&
              lightboxMediaItems[0].type === itemType;
            if (!isDuplicateOfFirstItem) {
              lightboxMediaItems.push({
                type: itemType,
                src: itemSrc,
                poster: itemPoster,
                posterMobile: itemPosterMobile,
              });
            }
          }
        });
      }
    }

    // Store the composed list of media items for the lightbox as a JSON string in the dataset.
    post.dataset.images = JSON.stringify(lightboxMediaItems);

    // Number of items in the lightbox, used for UI indicators (e.g., hover dots).
    const hoverDotsCount = lightboxMediaItems.length;

    // This array is only used to determine the *count* for hover dots on the grid item itself.
    // It does not need to store full paths or actual data, just needs the correct length.
    // const projectImagesForHoverDots = new Array(hoverDotsCount).fill(null); // Commented out as projectImagesForHoverDots is unused

    // --- Other dataset attributes for project details --- //
    if (project.fullVideoSrc)
      post.dataset.fullSrc = toAbsoluteAssetPath(project.fullVideoSrc); // Full version of video if different from grid thumbnail.
    if (project.poster)
      post.dataset.poster = toAbsoluteAssetPath(project.poster); // Main poster for videos.
    if (project.posterMobile)
      post.dataset.posterMobile = toAbsoluteAssetPath(project.posterMobile); // Mobile-specific main poster.
    post.dataset.software = project.software; // Software used, displayed as a string.
    post.dataset.description = project.description; // Main description text.
    post.dataset.mobileDescription =
      project.mobileDescription || project.description; // Mobile-specific description or fallback.
    post.dataset.bulletPoints = project.bulletPoints
      ? project.bulletPoints.join("|")
      : ""; // Array of bullet points, joined by pipe.
    post.dataset.toolsUsed = project.toolsUsed
      ? project.toolsUsed.join(", ")
      : ""; // Array of tools, joined by comma.
    post.dataset.idx = idx.toString(); // Index of the project, used for lightbox navigation.
    post.dataset.workType = project.workType || "personal"; // Type of work (e.g., "personal", "client").

    // --- Create and append actual media element (img or video) for the grid display --- //
    if (project.type === "image") {
      const img = document.createElement("img");
      img.src = toAbsoluteAssetPath(project.src); // Grid images use the main `project.src`.
      img.alt = project.alt || project.title || "Project Image";
      post.appendChild(img);
    } else if (project.type === "video") {
      const video = document.createElement("video");
      // Grid videos use mobile-specific source if available, otherwise main source.
      video.src =
        mobileDevice && project.srcMobile
          ? toAbsoluteAssetPath(project.srcMobile)
          : toAbsoluteAssetPath(project.src);
      if (project.poster) video.poster = toAbsoluteAssetPath(project.poster); // Poster for the grid video.
      video.autoplay = true;
      video.muted = true;
      video.loop = true; // Standard attributes for silent autoplaying grid videos.
      video.setAttribute("playsinline", ""); // Important for iOS inline playback.
      video.setAttribute("disablePictureInPicture", ""); // Prevent PiP button.
      video.alt = project.alt || project.title || "Project Video";
      post.appendChild(video);
    }

    // --- Create text overlay elements for hover effects --- //
    const textContainer = createEl("div", "post-text-container"); // Main container for all hover text.

    // Work type label (e.g., "PERSONAL WORK", "CLIENT WORK").
    let projectWorkLabelText = "PERSONAL WORK";
    if (project.workType === "client") {
      projectWorkLabelText = "CLIENT WORK";
    }
    const projectWorkLabelEl = createEl(
      "div",
      "post-hover-project-work-label",
      projectWorkLabelText,
    );
    textContainer.appendChild(projectWorkLabelEl);

    // Project Title.
    const titleEl = createEl("div", "post-hover-title", project.title);

    // Wrapper for title (on desktop) and subtitle to group them for centering.
    const mainTextWrapper = createEl("div", "post-hover-text-main");

    // Title placement depends on screen size (CSS handles final positioning).
    if (window.matchMedia && window.matchMedia("(max-width: 767px)").matches) {
      textContainer.appendChild(titleEl); // Mobile: title directly in textContainer.
    } else {
      mainTextWrapper.appendChild(titleEl); // Desktop: title inside mainTextWrapper.
    }

    // Project Subtitle (if it exists).
    if (project.subtitle && project.subtitle.trim() !== "") {
      const subtitleEl = createEl(
        "div",
        "post-hover-subtitle",
        project.subtitle,
      );
      mainTextWrapper.appendChild(subtitleEl);
    }
    textContainer.appendChild(mainTextWrapper); // Append wrapper (even if only subtitle is in it on mobile, or title+subtitle on desktop).

    // Image indicator dots, if there are multiple items for the lightbox.
    if (hoverDotsCount > 1) {
      const dotsContainer = createEl("div", "post-hover-image-dots");
      for (let i = 0; i < hoverDotsCount; i++) {
        const dotEl = createEl("span", "post-hover-image-dot");
        dotsContainer.appendChild(dotEl);
      }
      textContainer.appendChild(dotsContainer);
    }

    post.appendChild(textContainer);

    return post;
  }

  // Clear existing feed content and populate with new project posts.
  feedContainer.innerHTML = "";
  projects.forEach((project, idx) => {
    const post = createPostElement(project, idx);
    feedContainer.appendChild(post);
  });

  // After all posts are created, extract their dataset to form `allPostsData` for lightbox initialization.
  const allPostsElements = Array.from(document.querySelectorAll(".post"));
  allPostsData = allPostsElements.map((p) => ({ ...p.dataset }));

  // Add click listeners to each post to open the lightbox.
  allPostsElements.forEach((post) => {
    post.addEventListener("click", async (event) => {
      // Do not trigger lightbox if a link within the post text overlay (if any) was clicked.
      if (event.target.tagName === "A") return;
      try {
        // Ensure lightbox HTML and JS are loaded and initialized before opening.
        await loadAndInitLightbox();
      } catch (error) {
        console.error("Lightbox loading failed, cannot open project:", error); // Added console error
        return; // Don't proceed if lightbox isn't ready.
      }
      // If Lightbox is loaded and has an open method, call it with the project index.
      if (window.Lightbox && typeof window.Lightbox.open === "function") {
        const projectIndex = parseInt(post.dataset.idx, 10);
        window.Lightbox.open(projectIndex, 0); // Open lightbox to this project, first media item (index 0).
      }
    });
  });

  // ===== Masonry Layout, Video Playback & Intersection Observer ===== //
  const gridVideos = Array.from(
    document.querySelectorAll(".feed-container .video-post video"),
  ); // All video elements in the grid.
  let isMaximized = false; // Tracks if the parent window is maximized.
  let intersectionObserver = null; // Instance of IntersectionObserver for video visibility.

  // ===== Video State Management for Lightbox ===== //
  let videosPlayingBeforeLightbox = new Set(); // Tracks which videos were playing before lightbox opened

  // ===== Ultra-Safe DOM Query Caching ===== //
  // Cache frequently accessed DOM elements to avoid repeated queries
  // This is 100% safe and only improves performance without changing behavior
  let cachedFeedContainer = null;
  let cachedFeedPosts = null;

  function getCachedDOMElements() {
    // Only query DOM if we haven't cached the elements yet
    if (!cachedFeedContainer) {
      cachedFeedContainer = document.querySelector(".feed-container");
      cachedFeedPosts = cachedFeedContainer ?
        Array.from(cachedFeedContainer.querySelectorAll(".post")) : [];
    }
    return {
      feedContainer: cachedFeedContainer,
      posts: cachedFeedPosts
    };
  }



  // ===== Direct Lightbox Communication (Same Iframe Context) ===== //
  // Since lightbox.js runs in the same iframe as projects.js, we can use direct function calls
  // or custom events instead of postMessage to the parent window.

  /**
   * Global function that lightbox.js can call directly to notify about lightbox state changes.
   * This bypasses the postMessage system since both scripts are in the same iframe context.
   */
  window.handleLightboxStateChange = function(isOpen) {
    if (isOpen === true) {
      // Lightbox opened - save current playing states and pause all grid videos
      saveVideoPlayingStates();
      gridVideos.forEach((video) => {
        if (!video.paused) {
          video.pause();
        }
      });
    } else if (isOpen === false) {
      // Lightbox closed - restore previously playing videos
      if (isMaximized) {
        // If window is maximized, restore the videos that were playing before
        restoreVideoPlayingStates();
      } else {
        // If window is not maximized, restore previously playing videos and restart intersection observer
        restoreVideoPlayingStates();
        if (typeof setupIntersectionObserver === "function") {
          setupIntersectionObserver();
        }
      }
    }
  };

  /**
   * Applies a masonry-style layout to the project posts in the feed container.
   * Calculates column widths and positions posts absolutely.
   */
  function applyMasonryLayout() {
    // Use cached DOM elements for better performance (ultra-safe optimization)
    const { feedContainer: currentFeedContainer, posts: currentFeedPosts } = getCachedDOMElements();

    if (!currentFeedContainer) {
      sendMessageToParent({ type: "projects-ready" }); // Notify parent if container is gone.
      return;
    }

    // If no posts, set container height to auto and notify parent.
    if (currentFeedPosts.length === 0) {
      if (!currentFeedContainer.classList.contains("loaded")) {
        currentFeedContainer.classList.add("loaded");
      }
      currentFeedContainer.style.height = "auto";
      sendMessageToParent({ type: "projects-ready" });
      return;
    }

    // Get container padding for accurate position calculations.
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

    // Determine number of columns based on available width.
    let numColumns = 2; // Default for smaller screens.
    const gap = 12; // Vertical gap
    const horizontalGap = 16; // Horizontal gap between columns

    if (currentFeedContainer.offsetWidth >= 1200) {
      numColumns = 4;
    } else if (currentFeedContainer.offsetWidth >= 768) {
      numColumns = 3;
    }

    // Calculate column width, respecting a maximum column width.
    const maxColumnWidth = 320;
    const columnWidth = Math.min(
      (availableWidth - (numColumns - 1) * horizontalGap) / numColumns,
      maxColumnWidth,
    );

    // Calculate total grid width and left offset to center columns
    const totalGridWidth =
      numColumns * columnWidth + (numColumns - 1) * horizontalGap;
    const leftOffset = (availableWidth - totalGridWidth) / 2;

    // Set position and width for each post.
    currentFeedPosts.forEach((post) => {
      post.style.position = "absolute";
      post.style.width = `${columnWidth}px`;
    });

    // Array to track the height of each column.
    const columnHeights = Array(numColumns).fill(0);

    // Position each post in the shortest column.
    currentFeedPosts.forEach((post) => {
      const postHeight = post.offsetHeight; // Get actual height of the post.
      let shortestColumnIndex = 0;
      for (let i = 1; i < numColumns; i++) {
        if (columnHeights[i] < columnHeights[shortestColumnIndex]) {
          shortestColumnIndex = i;
        }
      }
      post.style.left = `${containerPaddingLeft + leftOffset + shortestColumnIndex * (columnWidth + horizontalGap)}px`;
      post.style.top = `${containerPaddingTop + columnHeights[shortestColumnIndex]}px`;
      columnHeights[shortestColumnIndex] += postHeight + gap; // Update height of the chosen column.
    });

    // Calculate the overall height of the feed container based on the tallest column.
    const effectiveColumnHeights = columnHeights.map(
      (h) => (h > 0 ? h - gap : 0), // Adjust for the last gap added.
    );
    const tallestColumnContentHeight = Math.max(0, ...effectiveColumnHeights);
    currentFeedContainer.style.height = `${containerPaddingTop + tallestColumnContentHeight + containerPaddingBottom}px`;

    // Add 'loaded' class for reveal animation and notify parent that projects are ready.
    // Only do this if we're not waiting for a recalculation
    if (!currentFeedContainer.dataset.revealProcessStarted && !currentFeedContainer.dataset.waitingForRecalc) {
      currentFeedContainer.dataset.revealProcessStarted = "true";
      if (currentFeedContainer) {
        if (!currentFeedContainer.classList.contains("loaded")) {
          currentFeedContainer.classList.add("loaded");
        }
        sendMessageToParent({ type: "projects-ready" });
      }
    }
  }

  /**
   * Initializes masonry layout after ensuring all grid videos have loaded their metadata
   * (or at least attempted to load), so their dimensions are somewhat stable for layout calculation.
   */
  function initMasonryWithVideoCheck() {
    if (!feedContainer) return;

    const videos = gridVideos;

    // If no videos, apply masonry layout directly.
    if (videos.length === 0) {
      applyMasonryLayout();
      return;
    }

    let videosToMonitor = videos.length;
    let videosReported = 0; // Count of videos that have either loaded metadata or errored.

    // Callback when a video has loaded metadata or errored.
    const onMediaReady = (mediaElement) => {
      // Clean up listeners for this specific media element.
      mediaElement.removeEventListener("loadedmetadata", onMediaReadyHandler);
      mediaElement.removeEventListener("loadeddata", onMediaReadyHandler);
      mediaElement.removeEventListener("error", onErrorHandler);
      videosReported++;
      // If all videos have reported, apply masonry layout.
      if (videosReported === videosToMonitor) {
        // Mark that we're waiting for recalculation to prevent showing the grid too early
        const { feedContainer: currentFeedContainer } = getCachedDOMElements();
        if (currentFeedContainer) {
          currentFeedContainer.dataset.waitingForRecalc = "true";
        }

        applyMasonryLayout();
        // Recalculate layout after a short delay to account for video dimension changes
        setTimeout(() => {
          applyMasonryLayout();
          // Now it's safe to show the grid
          if (currentFeedContainer) {
            delete currentFeedContainer.dataset.waitingForRecalc;
            if (!currentFeedContainer.dataset.revealProcessStarted) {
              currentFeedContainer.dataset.revealProcessStarted = "true";
              if (!currentFeedContainer.classList.contains("loaded")) {
                currentFeedContainer.classList.add("loaded");
              }
              sendMessageToParent({ type: "projects-ready" });
            }
          }
        }, 150);
      }
    };

    // Event handler functions to be bound to video elements.
    const onMediaReadyHandler = function (event) {
      onMediaReady(this, event.type);
    };
    const onErrorHandler = function (event) {
      // Treat error as 'ready' for layout purposes to avoid blocking indefinitely.
      onMediaReady(this, event.type);
    };

    videos.forEach((video) => {
      if (video.readyState >= 2) {
        // HAVE_CURRENT_DATA or more: metadata is likely available.
        videosReported++;
      } else {
        video.addEventListener("loadedmetadata", onMediaReadyHandler);
        video.addEventListener("loadeddata", onMediaReadyHandler); // loadeddata as a stronger guarantee
        video.addEventListener("error", onErrorHandler);
        // Also listen for resize events in case dimensions change after metadata loads
        video.addEventListener("resize", onMediaReadyHandler);
      }
    });

    // If all videos were already ready (e.g., cached), apply layout immediately.
    if (videosReported === videosToMonitor && videosToMonitor > 0) {
      // Mark that we're waiting for recalculation to prevent showing the grid too early
      const currentFeedContainer = document.querySelector(".feed-container");
      if (currentFeedContainer) {
        currentFeedContainer.dataset.waitingForRecalc = "true";
      }

      applyMasonryLayout();
      // Recalculate layout after a short delay to account for video dimension changes
      setTimeout(() => {
        applyMasonryLayout();
        // Now it's safe to show the grid
        const { feedContainer: currentFeedContainer } = getCachedDOMElements();
        if (currentFeedContainer) {
          delete currentFeedContainer.dataset.waitingForRecalc;
          if (!currentFeedContainer.dataset.revealProcessStarted) {
            currentFeedContainer.dataset.revealProcessStarted = "true";
            if (!currentFeedContainer.classList.contains("loaded")) {
              currentFeedContainer.classList.add("loaded");
            }
            sendMessageToParent({ type: "projects-ready" });
          }
        }
      }, 150);
    }
  }

  // Initial setup for masonry layout.
  if (feedContainer) {
    initMasonryWithVideoCheck();
    let resizeTimeout;
    // Re-apply masonry on window resize, with a short timeout to avoid excessive calls.
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(applyMasonryLayout, 150);
    });
  }

  /**
   * Saves the current playing state of all grid videos before lightbox opens.
   * Stores references to videos that are currently playing in videosPlayingBeforeLightbox Set.
   */
  function saveVideoPlayingStates() {
    videosPlayingBeforeLightbox.clear();
    gridVideos.forEach((video) => {
      if (!video.paused) {
        videosPlayingBeforeLightbox.add(video);
      }
    });
  }

  /**
   * Restores the playing state of videos that were playing before lightbox opened.
   * Only resumes videos that were actually playing before, not all visible videos.
   */
  function restoreVideoPlayingStates() {
    videosPlayingBeforeLightbox.forEach((video) => {
      // Double-check the video element still exists and is paused
      if (video && video.paused) {
        video.play().catch((error) => {
          console.error(`Failed to restore video playback for ${video.src}:`, error);
        });
      }
    });
    // Clear the saved state after restoring
    videosPlayingBeforeLightbox.clear();
  }

  /**
   * Plays or pauses grid videos based on their visibility status (`__isIntersecting` flag).
   */
  function playVisibleVideos() {
    if (!intersectionObserver) return;
    gridVideos.forEach((video) => {
      if (video.__isIntersecting) {
        // Flag set by IntersectionObserver.
        if (video.paused) video.play().catch(() => {}); // Play if visible and paused.
      } else {
        if (!video.paused) video.pause(); // Pause if not visible and playing.
      }
    });
  }

  /**
   * Sets up the IntersectionObserver to monitor the visibility of grid videos.
   * Updates a custom `__isIntersecting` flag on each video element.
   */
  function setupIntersectionObserver() {
    if (intersectionObserver) intersectionObserver.disconnect(); // Clean up existing observer.
    intersectionObserver = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.__isIntersecting = entry.isIntersecting; // Set visibility flag.
        });
        playVisibleVideos(); // Update playback based on new visibility states.
      },
      { root: document.querySelector(".scroll-content"), threshold: 0.1 }, // Observe within scroll container, 10% visibility threshold.
    );
    gridVideos.forEach((video) => {
      intersectionObserver.observe(video); // Start observing each grid video.
    });
    requestAnimationFrame(playVisibleVideos); // Initial check for visible videos.
  }

  /**
   * Disconnects the IntersectionObserver and cleans up custom flags on video elements.
   */
  function cleanupIntersectionObserver() {
    if (intersectionObserver) {
      intersectionObserver.disconnect();
      intersectionObserver = null;
    }
    gridVideos.forEach((video) => delete video.__isIntersecting); // Remove custom flag.
  }

  /**
   * Manages video playback and CSS classes based on the window's maximized state.
   * @param {boolean} maximized - True if the window is maximized, false otherwise.
   */
  function setMaximizedState(maximized) {
    isMaximized = maximized;
    const bodyEl = document.body;
    const maximizedClassName = "projects-window-maximized"; // CSS class for body when window is maximized.

    if (maximized) bodyEl.classList.add(maximizedClassName);
    else bodyEl.classList.remove(maximizedClassName);

    // When window is maximized, play all grid videos and disable intersection observer.
    // When unmaximized, pause all grid videos and re-enable intersection observer for visibility-based playback.
    if (isMaximized) {
      if (typeof cleanupIntersectionObserver === "function")
        cleanupIntersectionObserver();
      gridVideos.forEach((video) => video.play().catch(() => {})); // Play all, catch errors if any video can't play.
    } else {
      gridVideos.forEach((video) => video.pause());
      if (typeof setupIntersectionObserver === "function")
        setupIntersectionObserver();
    }
  }

  setupIntersectionObserver(); // Initial setup of the observer.

  // ----- General iFrame Interaction Click Listener ----- //
  // Notifies the parent window of any click within this iframe for focus management or other shell behaviors.
  document.addEventListener("click", () => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "iframe-interaction" }, "*");
    }
  });

  // ===== Mobile Feed Interaction (Scroll-based Overlay) ===== //
  // Shows a subtle hover effect on project posts when the user scrolls on mobile devices.
  const scrollContentElement = document.querySelector(".scroll-content");
  const feedContainerElement = document.querySelector(".feed-container");
  let mobileInteractionTimeout = null; // Timeout ID for clearing the hover effect.

  if (scrollContentElement && feedContainerElement) {
    const isMobileMediaQuery = window.matchMedia("(max-width: 767px)");

    // Handles scroll events to trigger the temporary hover effect on mobile.
    const handleScroll = () => {
      if (!isMobileMediaQuery.matches) return; // Only apply on mobile.
      if (mobileInteractionTimeout) {
        clearTimeout(mobileInteractionTimeout);
        mobileInteractionTimeout = null;
      }
      // Add 'hover' class to all posts to show overlays.
      document
        .querySelectorAll(".post")
        .forEach((post) => post.classList.add("hover"));
      // Remove 'hover' class after a short duration.
      mobileInteractionTimeout = setTimeout(() => {
        document
          .querySelectorAll(".post")
          .forEach((post) => post.classList.remove("hover"));
        mobileInteractionTimeout = null;
      }, 750); // Duration of the hover effect.
    };

    scrollContentElement.addEventListener("scroll", handleScroll, {
      passive: true,
    });
  }
  // --- End Mobile Feed Interaction ---

  // --- Aggressive Pinch Zoom Prevention (Lightbox Aware) --- //
  // Prevents default browser pinch-zoom and other touch gestures, except when interacting with the lightbox content.
  /**
   * Determines if zoom/gesture prevention should be applied based on the event target.
   * Allows gestures if the target is within an active lightbox.
   * @param {Event} event - The gesture or touch event.
   * @returns {boolean} True if prevention should apply, false otherwise.
   */
  function shouldPreventZoom(event) {
    const target = event.target;
    // Check if Lightbox is open and the event target is part of the lightbox UI.
    if (
      window.Lightbox &&
      typeof window.Lightbox.isOpen === "function" &&
      window.Lightbox.isOpen()
    ) {
      if (target.closest("#project-lightbox")) return false; // Do not prevent if inside lightbox.
    }
    return true; // Prevent by default if not inside an active lightbox.
  }

  // Event listeners for preventing various zoom/gesture behaviors.
  document.addEventListener(
    "gesturestart",
    (e) => {
      if (shouldPreventZoom(e)) e.preventDefault();
    },
    { passive: false },
  );
  document.addEventListener(
    "gesturechange",
    (e) => {
      if (shouldPreventZoom(e)) e.preventDefault();
    },
    { passive: false },
  );
  document.addEventListener(
    "gestureend",
    (e) => {
      if (shouldPreventZoom(e)) e.preventDefault();
    },
    { passive: false },
  );
  document.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length > 1 && shouldPreventZoom(e)) e.preventDefault();
    },
    { passive: false },
  ); // Multi-touch prevention.
  document.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length > 1 && shouldPreventZoom(e)) e.preventDefault();
    },
    { passive: false },
  );

  let lastTouchEnd = 0; // For double-tap prevention.
  document.addEventListener(
    "touchend",
    (event) => {
      if (!shouldPreventZoom(event)) return;
      const now = new Date().getTime();
      if (now - lastTouchEnd <= 300) event.preventDefault(); // Prevent action if taps are close (double-tap).
      lastTouchEnd = now;
    },
    { passive: false },
  );

  document.addEventListener(
    "wheel",
    (event) => {
      if (!shouldPreventZoom(event)) return;
      // Prevent Ctrl+wheel zoom and general wheel events on body/documentElement to avoid page-level zoom.
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
  // --- End Aggressive Pinch Zoom Prevention ---

  // ===== Global Message Listener (from Parent/Lightbox) ===== //
  // Handles messages from the parent window (e.g., toolbar actions) or from lightbox.js.
  window.addEventListener("message", (event) => {
    if (!event.data || typeof event.data.type !== "string") return; // Ignore malformed messages.

    const { type, action, maximized, open } = event.data;

    // Handle toolbar actions, passed to the active Lightbox instance.
    if (type === "toolbar-action") {
      if (window.Lightbox && lightboxDOMLoaded) {
        // Ensure Lightbox is ready.
        if (action === "navigateNext") window.Lightbox.navigateNext();
        else if (action === "navigatePrevious")
          window.Lightbox.navigatePrevious();
        else if (action === "home")
          window.Lightbox.close(); // 'home' action closes the lightbox.
        else if (action === "viewDescription")
          window.Lightbox.toggleDescription();
      }
      // Handle messages to set the maximized state of the window (from parent shell).
    } else if (type === "set-maximized-state") {
      setMaximizedState(maximized);
      // Handle lightbox state changes to control video playback
    } else if (type === "lightbox-state") {
      if (open === true) {
        // Lightbox opened - save current playing states and pause all grid videos
        saveVideoPlayingStates();
        gridVideos.forEach((video) => {
          if (!video.paused) video.pause();
        });
      } else if (open === false) {
        // Lightbox closed - restore previously playing videos
        if (isMaximized) {
          // If window is maximized, restore the videos that were playing before
          restoreVideoPlayingStates();
        } else {
          // If window is not maximized, restore previously playing videos and restart intersection observer
          restoreVideoPlayingStates();
          if (typeof setupIntersectionObserver === "function") {
            setupIntersectionObserver();
          }
        }
      }
    }
  });
}); // Closes DOMContentLoaded
