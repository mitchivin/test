/*
 * main.js — Application entrypoint for the Windows XP simulation.
 * Orchestrates initialization of all core UI components (Taskbar, Desktop, WindowManager),
 * handles the boot sequence, sets up global event handling, and manages various UX features
 * like tooltips, CRT effects, mobile/landscape orientation blocks, and viewport scaling adjustments.
 * This is the primary script loaded by `index.html`.
 *
 * @file src/scripts/main.js
 */
import Desktop from "./gui/desktop.js";
import Taskbar from "./gui/taskbar.js";
import WindowManager from "./gui/window.js";
import { eventBus, EVENTS } from "./utils/eventBus.js";
import { initBootSequence } from "./gui/boot.js";
import { setupTooltips } from "./gui/tooltip.js";
import { initRandomScanline } from "./utils/crtEffect.js";
import { isMobileDevice } from "./utils/device.js";

let globalTaskbarInstance = null; // Stores the global Taskbar instance for cross-module access.

// ===== App Initialization =====
// Handles the boot sequence, preloading, and main UI setup after DOM is ready.
document.addEventListener("DOMContentLoaded", () => {
  // Expose eventBus and EVENTS to global window for iframe access
  // This allows sandboxed iframes (like Music Player) to publish and subscribe to events on the main parent window.
  window.eventBus = eventBus;
  window.EVENTS = EVENTS;

  // Preload app iframes before showing desktop
  const preloadApps = [
    { id: "about-window", src: "src/apps/about/about.html" },
    { id: "resume-window", src: "src/apps/resume/resume.html" },
    { id: "projects-window", src: "src/apps/projects/projects.html" },
    { id: "contact-window", src: "src/apps/contact/contact.html" },
  ];

  // Dynamically preload all assets referenced in projects.json
  let loadedCount = 0; // Tracks how many preload iframes have finished loading
  let projectsData = []; // Variable to store fetched projects data

  // Fetch projects.json once and store it
  fetch("projects.json")
    .then((response) => response.json())
    .then((projects) => {
      projectsData = projects; // Store the data
      const assetSet = new Set();
      projects.forEach((project) => {
        ["src", "fullVideoSrc", "poster", "posterMobile", "srcMobile"].forEach(
          (key) => {
            if (project[key]) assetSet.add(project[key]);
          },
        );
        if (Array.isArray(project.images)) {
          project.images.forEach((img) => {
            if (typeof img === "string") {
              assetSet.add(img);
            } else if (typeof img === "object" && img !== null) {
              ["src", "poster", "posterMobile", "srcMobile"].forEach((key) => {
                if (img[key]) assetSet.add(img[key]);
              });
            }
          });
        }
      });
      const head = document.head || document.getElementsByTagName("head")[0];
      assetSet.forEach((assetPath) => {
        const ext = assetPath.split(".").pop().trim();
        if (ext === "webp") {
          const link = document.createElement("link");
          link.rel = "preload"; // Specifies that the browser should preload this resource.
          link.href = assetPath;
          link.as = "image"; // Specifies the type of content to be preloaded.
          try {
            head.appendChild(link);
          } catch (e) {
            console.error(`Failed to preload image ${assetPath}:`, e);
          }
        } else if (ext === "mp4") {
          const link = document.createElement("link");
          link.rel = "preload"; // Specifies that the browser should preload this resource.
          link.href = assetPath;
          link.as = "video"; // Specifies the type of content to be preloaded.
          try {
            head.appendChild(link);
          } catch (e) {
            console.error(`Failed to preload video ${assetPath}:`, e);
          }
        }
      });
    });

  const preloadContainer = document.createElement("div");
  preloadContainer.style.display = "none";
  preloadContainer.id = "preload-apps-container";
  document.body.appendChild(preloadContainer);

  /**
   * Called when all preload iframes have finished loading.
   * Removes the preload container and initializes the main UI components and global event listeners.
   */
  function onAllPreloaded() {
    preloadContainer.remove();
    // Now initialize the rest of the app
    globalTaskbarInstance = new Taskbar(eventBus);
    new Desktop(eventBus);
    new WindowManager(eventBus);
    initBootSequence(eventBus, EVENTS, projectsData);
    eventBus.subscribe(EVENTS.SHUTDOWN_REQUESTED, () => {
      sessionStorage.removeItem("logged_in");
      const currentPath = window.location.pathname;
      window.location.assign(currentPath + "?forceBoot=true");
    });
    initRandomScanline();
    setupTooltips("[data-tooltip]");
    ensureLandscapeBlock();
    handleOrientationBlock();
    setRealVh();
    scaleDesktopIconsToFitMobile();

    // Double-tap prevention for mobile is handled via the touchend-based logic below. If touchstart-based prevention is needed in the future, see version history.

    // ===== Global Message Event Listener =====
    // Handles cross-window communication for special actions (e.g., closing start menu, opening Instagram)
    window.addEventListener("message", (event) => {
      if (event?.data?.type === "resume-interaction" && globalTaskbarInstance) {
        const startMenu = globalTaskbarInstance.startMenuComponent;
        if (startMenu && startMenu.startMenu?.classList.contains("active")) {
          startMenu.closeStartMenu();
        }
      }
      // Listen for Instagram open request from About iframe
      if (
        event?.data?.type === "open-instagram-from-about" &&
        globalTaskbarInstance
      ) {
        // Find the Instagram menu item and simulate a click without opening the Start Menu
        const instagramMenuItem = document.querySelector(
          ".menu-item#menu-instagram",
        );
        if (instagramMenuItem) {
          instagramMenuItem.click();
        } else {
          console.warn(
            "Instagram menu item not found for programmatic click from About page.",
          );
        }
      }
    });

    // ===== Mobile & Touch UX Event Listeners =====
    // Prevents pinch-zoom, double-tap zoom, and other unwanted gestures on mobile devices.

    // --- Aggressive Pinch Zoom Prevention (Main Page) ---
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
    // --- End Aggressive Pinch Zoom Prevention ---

    // ===== Orientation & Resize Event Listeners =====
    window.addEventListener("orientationchange", () => {
      handleOrientationBlock();
      setRealVh();
    });
    window.addEventListener("resize", () => {
      handleOrientationBlock();
      setRealVh();
      scaleDesktopIconsToFitMobile();
    });
  }

  // Preload all app iframes and call onAllPreloaded when done
  preloadApps.forEach((app) => {
    const iframe = document.createElement("iframe");
    iframe.src = app.src;
    iframe.name = app.id + "-preload";
    iframe.setAttribute("data-preload-app", app.id);
    iframe.onload = () => {
      loadedCount++;
      if (loadedCount === preloadApps.length) {
        onAllPreloaded();
      }
    };
    preloadContainer.appendChild(iframe);
  });
});

// ===== Utility Functions =====

/**
 * Ensures the landscape orientation block element exists in the DOM.
 * If it doesn't exist, it creates and appends it to the body.
 * This block is used to prompt mobile users to return to portrait mode.
 * @returns {HTMLElement} The landscape block element.
 */
function ensureLandscapeBlock() {
  let landscapeBlock = document.getElementById("landscape-block");
  if (!landscapeBlock) {
    landscapeBlock = document.createElement("div");
    landscapeBlock.id = "landscape-block";
    landscapeBlock.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <img src="assets/gui/boot/loading.webp" alt="Loading animation" style="max-width: 200px; height: auto;" />
        <div class="landscape-message">Please rotate your device back to portrait mode.</div>
      </div>
    `;
    document.body.appendChild(landscapeBlock);
  }
  return landscapeBlock;
}

/**
 * Shows or hides the landscape orientation block based on device type and orientation.
 * The block is shown only on mobile devices in landscape mode.
 */
function handleOrientationBlock() {
  const mobileDevice = isMobileDevice();
  const isLandscape = window.matchMedia("(orientation: landscape)").matches;
  const block = document.getElementById("landscape-block");
  if (block) {
    block.style.display = mobileDevice && isLandscape ? "flex" : "none";
  }
}

/**
 * Calculates and sets a CSS custom property (`--real-vh`) representing 1% of the visual viewport height.
 * This helps in creating layouts that are truly responsive to the visible area,
 * especially on mobile devices where browser UI can affect `vh` units.
 * Uses `window.visualViewport` if available, otherwise falls back to `window.innerHeight`.
 */
function setRealVh() {
  const vh =
    (window.visualViewport
      ? window.visualViewport.height
      : window.innerHeight) * 0.01;
  document.documentElement.style.setProperty("--real-vh", `${vh}px`);
}

/**
 * Scales desktop icons within their container to fit the available width on mobile devices.
 * It calculates a scale factor based on the container width, number of icons, icon width, and gap.
 * The scale factor is then applied via a CSS custom property (`--icon-scale`) on the container.
 * @description This function targets elements with the class `desktop-icons` and its children
 * with the class `desktop-icon`.
 */
function scaleDesktopIconsToFitMobile() {
  const containers = [document.querySelector(".desktop-icons")];
  containers.forEach((container) => {
    if (!container) return;
    const icons = Array.from(container.children).filter((child) =>
      child.classList.contains("desktop-icon"),
    );
    if (icons.length === 0) return;
    const gap = 8;
    const iconWidth = 90;
    const availableWidth = container.offsetWidth;
    const totalIconWidth = icons.length * iconWidth + (icons.length - 1) * gap;
    const scale = Math.min(1, availableWidth / totalIconWidth);
    container.style.setProperty("--icon-scale", scale);
  });
}
