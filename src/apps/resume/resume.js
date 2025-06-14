/*
  resume.js — Resume App Interactivity for Windows XP Simulation
  Handles interactivity for the Resume app, including image loading from info.json,
  zoom-on-click, pan-while-zoomed functionality, and communication with the
  parent window (e.g., for maximized state).
  @file src/apps/resume/resume.js
*/

// ----- Parent Window Message Listener (Maximized State) ----- //
// Listens for messages from the parent window to toggle a class when the window is maximized or unmaximized.
// This allows CSS to apply different styles (e.g., padding adjustments) when the app is in maximized mode.
window.addEventListener("message", function (event) {
  const appRoot = document.getElementById("appRoot");
  if (!appRoot) return;

  if (event.data && event.data.type === "window:maximized") {
    appRoot.classList.add("maximized-mode");
  } else if (event.data && event.data.type === "window:unmaximized") {
    appRoot.classList.remove("maximized-mode");
  }
});

/**
 * Prepends the necessary path to asset URLs to ensure they load correctly
 * when the Resume app is displayed within an iframe in the main shell.
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
  const resumeImage = document.getElementById("resumeImage");
  const scroller = document.getElementById("appRoot"); // The main scrollable container for the resume image.

  // ----- Fetch and Process info.json for Resume Image ----- //
  // Loads the resume image path from an external configuration file.
  let info = null;
  try {
    const response = await fetch("../../../info.json");
    info = await response.json();
  } catch (e) {
    console.error("Failed to load info.json", e);
    return;
  }
  if (!info || !info.resume) return;

  // Set resume image src
  if (resumeImage) {
    resumeImage.src = transformAssetPath(info.resume.webp);
  }

  // ----- Initialize Zoom and Pan Functionality ----- //
  /**
   * Sets up event listeners for zoom-on-click and pan-while-zoomed functionality on the resume image.
   */
  function initializeZoomPan() {
    let isDragging = false; // Flag to track if the image is currently being dragged.
    let startX, startY; // Initial mouse coordinates when dragging starts.
    let startScrollLeft, startScrollTop; // Initial scroll positions of the scroller when dragging starts.
    let didDrag = false; // Flag to differentiate between a click and a drag-release.

    // Prevent the browser's default image drag behavior.
    resumeImage.addEventListener("dragstart", (e) => e.preventDefault());

    // Handles click events on the resume image for zooming in and out.
    resumeImage.addEventListener("click", (e) => {
      // If a drag operation just finished, don't process this as a click for zoom.
      if (didDrag) {
        didDrag = false; // Reset flag for next interaction.
        return;
      }
      const isZoomed = resumeImage.classList.contains("zoomed");

      if (!isZoomed) {
        // --- Zoom In --- //
        const clickX = e.offsetX; // Click position relative to the image element.
        const clickY = e.offsetY;
        const originalWidth = resumeImage.clientWidth; // Current displayed width of the image.
        const originalHeight = resumeImage.clientHeight;

        // Avoid division by zero if image dimensions are not yet available.
        if (originalWidth === 0 || originalHeight === 0) {
          return;
        }

        resumeImage.classList.add("zoomed");

        // Use requestAnimationFrame to ensure calculations are based on dimensions *after* the .zoomed class is applied and layout is updated.
        requestAnimationFrame(() => {
          const zoomedWidth = resumeImage.clientWidth; // Width of the image *after* .zoomed class is applied.
          const scale = zoomedWidth / originalWidth; // Calculate the zoom scale factor.

          // Calculate target scroll positions to center the clicked point in the viewport.
          const targetX = clickX * scale; // Click position scaled to the new zoomed image size.
          const targetY = clickY * scale;
          const viewportWidth = scroller.clientWidth;
          const viewportHeight = scroller.clientHeight;

          let targetScrollLeft = targetX - viewportWidth / 2;
          let targetScrollTop = targetY - viewportHeight / 2;

          // Clamp scroll values to be within the bounds of the scrollable area.
          targetScrollLeft = Math.max(
            0,
            Math.min(targetScrollLeft, scroller.scrollWidth - viewportWidth),
          );
          targetScrollTop = Math.max(
            0,
            Math.min(targetScrollTop, scroller.scrollHeight - viewportHeight),
          );

          // Scroll to the calculated position instantly.
          scroller.scrollTo({
            left: targetScrollLeft,
            top: targetScrollTop,
            behavior: "auto", // Use "auto" for instant scroll, "smooth" for animated.
          });
        });
      } else {
        // --- Zoom Out --- //
        resumeImage.classList.remove("zoomed");
        // Reset scroll position to top-left when zooming out.
        scroller.scrollTo({ left: 0, top: 0, behavior: "auto" });
      }
      // Notify parent window of interaction (e.g., to close Start Menu if open).
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "resume-interaction" }, "*");
      }
    });

    // Handles mousedown event to initiate panning when the image is zoomed.
    resumeImage.addEventListener("mousedown", (e) => {
      // Panning is only allowed when the image is zoomed.
      if (!resumeImage.classList.contains("zoomed")) return;
      isDragging = true;
      didDrag = false; // Reset drag flag at the start of a potential drag.
      resumeImage.classList.add("dragging"); // Apply dragging cursor style.
      startX = e.clientX; // Record initial mouse position.
      startY = e.clientY;
      startScrollLeft = scroller.scrollLeft; // Record initial scroll position.
      startScrollTop = scroller.scrollTop;
      e.preventDefault(); // Prevent text selection or other default mousedown actions.
    });

    // Handles mousemove event for panning the image if dragging is active.
    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      e.preventDefault();
      didDrag = true; // Set flag to true as soon as mouse moves while dragging.
      const dx = e.clientX - startX; // Calculate change in mouse position.
      const dy = e.clientY - startY;
      // Update scroll position based on mouse movement.
      scroller.scrollLeft = startScrollLeft - dx;
      scroller.scrollTop = startScrollTop - dy;
    });

    // Handles mouseup event to stop panning.
    document.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      resumeImage.classList.remove("dragging"); // Remove dragging cursor style.
    });

    // Handles mouseleave event to stop panning if the mouse leaves the document area while dragging.
    document.addEventListener("mouseleave", () => {
      if (isDragging) {
        isDragging = false;
        resumeImage.classList.remove("dragging");
      }
    });
  }

  // Initialize zoom/pan functionality after the image is loaded.
  // This ensures that image dimensions are available for calculations.
  if (resumeImage.complete && resumeImage.naturalWidth !== 0) {
    // If image is already complete (e.g., cached), initialize immediately.
    initializeZoomPan();
  } else {
    // Otherwise, wait for the 'load' event.
    resumeImage.addEventListener("load", initializeZoomPan);
  }
});

// ----- Global Click Listener for iFrame Interaction ----- //
// Notifies the parent window of any click within the iframe.
// This can be used by the shell to manage focus or other iframe-related behaviors.
document.addEventListener("click", () => {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "iframe-interaction" }, "*");
  }
});

// --- Aggressive Pinch Zoom Prevention ---
// Prevent gestures
document.addEventListener(
  "gesturestart",
  function (e) {
    e.preventDefault();
  },
  { passive: false },
);
document.addEventListener(
  "gesturechange",
  function (e) {
    e.preventDefault();
  },
  { passive: false },
);
document.addEventListener(
  "gestureend",
  function (e) {
    e.preventDefault();
  },
  { passive: false },
);

// Prevent multi-touch interactions (common for pinch-zoom)
document.addEventListener(
  "touchstart",
  function (e) {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  },
  { passive: false },
);
document.addEventListener(
  "touchmove",
  function (e) {
    if (e.touches.length > 1) {
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
    const now = new Date().getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  },
  { passive: false },
);

// Prevent Ctrl+wheel zoom and general wheel events on the body or html element.
// This is to avoid interference with the app's custom zoom/scroll or page-level browser zoom.
document.addEventListener(
  "wheel",
  function (event) {
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
