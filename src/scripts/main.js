/**
 * main.js — Application Entrypoint for Windows XP Simulation
 *
 * Orchestrates initialization of all core components and sets up global event handling.
 * Handles:
 * - Taskbar, Desktop, WindowManager, Boot sequence
 * - Tooltip and CRT scanline effect initialization
 * - Mobile/landscape handling and viewport scaling
 *
 * Usage:
 *   Entry point, loaded by index.html
 *
 * @module main
 */
import Desktop from "./gui/desktop.js";
import Taskbar from "./gui/taskbar.js";
import WindowManager from "./gui/window.js";
import { eventBus, EVENTS } from "./utils/eventBus.js";
import { initBootSequence } from "./gui/boot.js";
import { setupTooltips } from "./gui/tooltip.js";
import { initRandomScanline } from "./utils/crtEffect.js";

let lastTouchStartTime = 0;
let globalTaskbarInstance = null;

// ===== App Initialization =====
document.addEventListener("DOMContentLoaded", () => {
  // Preload app iframes before showing desktop
  const preloadApps = [
    { id: "about-window", src: "src/apps/about/about.html" },
    { id: "resume-window", src: "src/apps/resume/resume.html" },
    { id: "internet-window", src: "src/apps/projects/projects.html" },
    { id: "contact-window", src: "src/apps/contact/contact.html" },
  ];

  // Preload all assets in assets/apps/projects
  const projectAssets = [
    "left.webp",
    "right.webp",
    "close.webp",
    "projectsbg.webp",
    "videoposter3.webp",
    "videoposter2.webp",
    "videoposter1.webp",
    "videothumb1.mp4",
    "videothumb2.mp4",
    "videothumb3.mp4",
    "video1.mp4",
    "video2.mp4",
    "video3.mp4",
    "carousel1.webp",
    "carousel2.webp",
    "carousel3.webp",
    "image1.webp",
    "image2.webp",
    "image3.webp",
    "image4.webp",
    "image5.webp",
    "image6.webp"
  ];
  const head = document.head || document.getElementsByTagName('head')[0];
  projectAssets.forEach(filename => {
    const ext = filename.split('.').pop();
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = `assets/apps/projects/${filename}`;
    if (ext === 'webp') {
      link.as = 'image';
    } else if (ext === 'mp4') {
      link.as = 'video';
    } else {
      link.as = 'fetch';
    }
    head.appendChild(link);
  });

  const preloadContainer = document.createElement("div");
  preloadContainer.style.display = "none";
  preloadContainer.id = "preload-apps-container";
  document.body.appendChild(preloadContainer);
  let loadedCount = 0;
  function onAllPreloaded() {
    preloadContainer.remove();
    // Now initialize the rest of the app
    globalTaskbarInstance = new Taskbar(eventBus);
    new Desktop(eventBus);
    new WindowManager(eventBus);
    initBootSequence(eventBus, EVENTS);
    eventBus.subscribe(EVENTS.SHUTDOWN_REQUESTED, () => {
      sessionStorage.removeItem("logged_in");
      const currentPath = window.location.pathname;
      window.location.assign(currentPath + "?forceBoot=true");
    });
    initRandomScanline();
    setupTooltips("[data-tooltip]");
    ensureLandscapeBlock();
    handleOrientationBlock();
    window.addEventListener("orientationchange", handleOrientationBlock);
    window.addEventListener("resize", handleOrientationBlock);
    setRealVh();
    scaleDesktopIconsToFitMobile();
    document.addEventListener('touchstart', (event) => {
      const now = Date.now();
      const timeSinceLastTouch = now - lastTouchStartTime;
      const doubleTapThreshold = 300;
      if (timeSinceLastTouch < doubleTapThreshold && event.touches.length === 1) {
        event.preventDefault();
      }
      lastTouchStartTime = now;
    }, { passive: false });
    window.addEventListener('message', (event) => {
      if (event?.data?.type === 'resume-interaction' && globalTaskbarInstance) {
        const startMenu = globalTaskbarInstance.startMenuComponent;
        if (startMenu && startMenu.startMenu?.classList.contains('active')) {
          startMenu.closeStartMenu();
        }
      }
      // Listen for Instagram open request from About iframe
      if (event?.data?.type === 'open-instagram-from-about' && globalTaskbarInstance) {
        // Find the Instagram menu item and simulate a click without opening the Start Menu
        const startMenu = globalTaskbarInstance.startMenuComponent;
        const instagramMenuItem = document.querySelector('.menu-item#menu-instagram');
        if (instagramMenuItem) {
          instagramMenuItem.click();
        } else if (startMenu && startMenu._handleMenuClick) {
          // Fallback: manually trigger the handler with a fake event
          const fakeEvent = { target: { closest: () => ({ dataset: { action: 'open-url', url: 'https://www.instagram.com/mitchivin' } }) }, stopPropagation: () => {}, preventDefault: () => {} };
          startMenu._handleMenuClick(fakeEvent);
        }
      }
    });
  }
  preloadApps.forEach(app => {
    const iframe = document.createElement('iframe');
    iframe.src = app.src;
    iframe.name = app.id + '-preload';
    iframe.setAttribute('data-preload-app', app.id);
    iframe.onload = () => {
      loadedCount++;
      if (loadedCount === preloadApps.length) {
        onAllPreloaded();
      }
    };
    preloadContainer.appendChild(iframe);
  });
});

function ensureLandscapeBlock() {
  if (!document.getElementById("landscape-block")) {
    const block = document.createElement("div");
    block.id = "landscape-block";
    block.innerHTML = `
      <div>
        <strong>Rotate your device</strong><br>
        This app is best experienced in portrait mode.<br>
        Please rotate your device back.
      </div>
    `;
    document.body.appendChild(block);
  }
}

function handleOrientationBlock() {
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const isLandscape = window.matchMedia("(orientation: landscape)").matches;
  const block = document.getElementById("landscape-block");
  if (block) {
    block.style.display = isMobile && isLandscape ? "flex" : "none";
  }
}

function setRealVh() {
  const vh =
    (window.visualViewport
      ? window.visualViewport.height
      : window.innerHeight) * 0.01;
  document.documentElement.style.setProperty("--real-vh", `${vh}px`);
}

function scaleDesktopIconsToFitMobile() {
  const containers = [
    document.querySelector(".desktop-icons"),
  ];
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
