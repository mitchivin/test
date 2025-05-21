// ==================================================
//  resume.js — Resume App Interactivity for Windows XP Simulation
//  Handles zoom, pan, and communication for the resume window.
// ==================================================

window.addEventListener("message", function (event) {
  const appRoot = document.getElementById("appRoot");
  if (!appRoot) return;

  if (event.data && event.data.type === "window:maximized") {
    appRoot.classList.add("maximized-mode");
  } else if (event.data && event.data.type === "window:unmaximized") {
    appRoot.classList.remove("maximized-mode");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const resumeImage = document.getElementById("resumeImage");
  const scroller = document.getElementById("appRoot");

  if (!resumeImage || !scroller) {
    return;
  }

  function initializeZoomPan() {
    let isDragging = false;
    let startX, startY, startScrollLeft, startScrollTop;
    let didDrag = false;

    resumeImage.addEventListener("dragstart", (e) => e.preventDefault());

    resumeImage.addEventListener("click", (e) => {
      if (didDrag) {
        didDrag = false;
        return;
      }
      const isZoomed = resumeImage.classList.contains("zoomed");
      if (!isZoomed) {
        const clickX = e.offsetX;
        const clickY = e.offsetY;
        const originalWidth = resumeImage.clientWidth;
        const originalHeight = resumeImage.clientHeight;

        if (originalWidth === 0 || originalHeight === 0) {
          return;
        }

        resumeImage.classList.add("zoomed");
        requestAnimationFrame(() => {
          const zoomedWidth = resumeImage.clientWidth;
          const scale = zoomedWidth / originalWidth;
          const targetX = clickX * scale;
          const targetY = clickY * scale;
          const viewportWidth = scroller.clientWidth;
          const viewportHeight = scroller.clientHeight;
          let targetScrollLeft = targetX - viewportWidth / 2;
          let targetScrollTop = targetY - viewportHeight / 2;
          targetScrollLeft = Math.max(
            0,
            Math.min(targetScrollLeft, scroller.scrollWidth - viewportWidth),
          );
          targetScrollTop = Math.max(
            0,
            Math.min(targetScrollTop, scroller.scrollHeight - viewportHeight),
          );
          scroller.scrollTo({
            left: targetScrollLeft,
            top: targetScrollTop,
            behavior: "auto",
          });
        });
      } else {
        resumeImage.classList.remove("zoomed");
        scroller.scrollTo({ left: 0, top: 0, behavior: "auto" });
      }
      // Notify parent of interaction for Start Menu closing
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "resume-interaction" }, "*");
      }
    });

    resumeImage.addEventListener("mousedown", (e) => {
      // Only allow panning if zoomed
      if (!resumeImage.classList.contains("zoomed")) return;
      isDragging = true;
      didDrag = false;
      resumeImage.classList.add("dragging");
      startX = e.clientX;
      startY = e.clientY;
      startScrollLeft = scroller.scrollLeft;
      startScrollTop = scroller.scrollTop;
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      e.preventDefault();
      didDrag = true;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      scroller.scrollLeft = startScrollLeft - dx;
      scroller.scrollTop = startScrollTop - dy;
    });

    document.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      resumeImage.classList.remove("dragging");
    });

    document.addEventListener("mouseleave", () => {
      // Changed from resumeImage to document
      if (isDragging) {
        isDragging = false;
        resumeImage.classList.remove("dragging");
      }
    });
  }

  // Check if the image is already loaded (e.g. from cache)
  if (resumeImage.complete && resumeImage.naturalWidth !== 0) {
    initializeZoomPan();
  } else {
    // Otherwise, wait for the load event
    resumeImage.addEventListener("load", initializeZoomPan);
    resumeImage.addEventListener("error", () => {});
  }
});

document.addEventListener("click", () => {
  // Optionally: filter out clicks inside your own popouts/menus if needed
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

// Prevent Ctrl+wheel zoom and general wheel events on the body
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
