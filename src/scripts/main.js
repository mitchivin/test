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
import { projects } from '../data/projects.js';
import { aboutParagraphs, skills, software } from '../data/about.js';
import { contactName, contactEmail } from '../data/contact.js';
import { loginUserIcon, loginLoadingImage } from '../data/login.js';
import { wallpaperDesktop, wallpaperMobile, socialLinks, socialLinksAbout } from '../data/misc.js';
import { resumeImage, resumePDF } from '../data/resume.js';

let lastTouchStartTime = 0;
let globalTaskbarInstance = null;

// ===== App Initialization =====
document.addEventListener("DOMContentLoaded", () => {
  // --- Dynamic Data Asset Preloading ---
  const head = document.head || document.getElementsByTagName('head')[0];
  const seen = new Set();
  // Preload all project assets
  projects.forEach(project => {
    ['src', 'lowres', 'poster'].forEach(key => {
      if (project[key] && !seen.has(project[key])) {
        seen.add(project[key]);
        const ext = project[key].split('.').pop().toLowerCase();
        const link = document.createElement('link');
        link.rel = 'preload';
        // Remove leading ../../../ for correct path relative to index.html
        let href = project[key].replace(/^\.\.\/\.\.\/\.\//, '');
        link.href = href;
        if (ext === 'webp' || ext === 'jpg' || ext === 'jpeg' || ext === 'png') {
          link.as = 'image';
        } else if (ext === 'mp4' || ext === 'webm' || ext === 'mov') {
          link.as = 'video';
        } else {
          link.as = 'fetch';
        }
        head.appendChild(link);
      }
    });
  });
  // Preload About app icons and images
  aboutParagraphs.forEach(p => {
    if (p.icon && !seen.has(p.icon)) {
      seen.add(p.icon);
      const ext = p.icon.split('.').pop().toLowerCase();
      const link = document.createElement('link');
      link.rel = 'preload';
      let href = p.icon.replace(/^\.\.\/\.\.\/\.\//, '');
      link.href = href;
      link.as = (ext === 'webp' || ext === 'jpg' || ext === 'jpeg' || ext === 'png') ? 'image' : 'fetch';
      head.appendChild(link);
    }
  });
  skills.forEach(s => {
    if (s.icon && !seen.has(s.icon)) {
      seen.add(s.icon);
      const ext = s.icon.split('.').pop().toLowerCase();
      const link = document.createElement('link');
      link.rel = 'preload';
      let href = s.icon.replace(/^\.\.\/\.\.\/\.\//, '');
      link.href = href;
      link.as = (ext === 'webp' || ext === 'jpg' || ext === 'jpeg' || ext === 'png') ? 'image' : 'fetch';
      head.appendChild(link);
    }
  });
  software.forEach(s => {
    if (s.icon && !seen.has(s.icon)) {
      seen.add(s.icon);
      const ext = s.icon.split('.').pop().toLowerCase();
      const link = document.createElement('link');
      link.rel = 'preload';
      let href = s.icon.replace(/^\.\.\/\.\.\/\.\//, '');
      link.href = href;
      link.as = (ext === 'webp' || ext === 'jpg' || ext === 'jpeg' || ext === 'png') ? 'image' : 'fetch';
      head.appendChild(link);
    }
  });
  // Preload Resume image and PDF
  [resumeImage, resumePDF].forEach(asset => {
    if (asset && !seen.has(asset)) {
      seen.add(asset);
      const ext = asset.split('.').pop().toLowerCase();
      const link = document.createElement('link');
      link.rel = 'preload';
      let href = asset.replace(/^\.\.\/\.\.\/\.\//, '');
      link.href = href;
      link.as = (ext === 'webp' || ext === 'jpg' || ext === 'jpeg' || ext === 'png') ? 'image' : (ext === 'pdf' ? 'document' : 'fetch');
      head.appendChild(link);
    }
  });
  // Preload Login screen user icon and loading image
  [loginUserIcon, loginLoadingImage].forEach(asset => {
    if (asset && !seen.has(asset)) {
      seen.add(asset);
      const ext = asset.split('.').pop().toLowerCase();
      const link = document.createElement('link');
      link.rel = 'preload';
      let href = asset.replace(/^\.\.\/\.\.\/\.\//, '');
      link.href = href;
      link.as = (ext === 'webp' || ext === 'jpg' || ext === 'jpeg' || ext === 'png') ? 'image' : 'fetch';
      head.appendChild(link);
    }
  });
  // Preload wallpapers
  [wallpaperDesktop, wallpaperMobile].forEach(asset => {
    if (asset && !seen.has(asset)) {
      seen.add(asset);
      const ext = asset.split('.').pop().toLowerCase();
      const link = document.createElement('link');
      link.rel = 'preload';
      let href = asset.replace(/^\.\/|^\.\.\/\.\/|^\.\.\/\.\.\/\.\//, '');
      link.href = href;
      link.as = (ext === 'webp' || ext === 'jpg' || ext === 'jpeg' || ext === 'png') ? 'image' : 'fetch';
      head.appendChild(link);
    }
  });
  // Preload About social link icons
  if (Array.isArray(socialLinksAbout)) {
    socialLinksAbout.forEach(s => {
      if (s.icon && !seen.has(s.icon)) {
        seen.add(s.icon);
        const ext = s.icon.split('.').pop().toLowerCase();
        const link = document.createElement('link');
        link.rel = 'preload';
        let href = s.icon.replace(/^\.\.\/\.\.\/\.\//, '');
        link.href = href;
        link.as = (ext === 'webp' || ext === 'jpg' || ext === 'jpeg' || ext === 'png') ? 'image' : 'fetch';
        head.appendChild(link);
      }
    });
  }

  // Preload app iframes before showing desktop
  const preloadApps = [
    { id: "about-window", src: "src/apps/about/about.html" },
    { id: "resume-window", src: "src/apps/resume/resume.html" },
    { id: "internet-window", src: "src/apps/projects/projects.html" },
    { id: "contact-window", src: "src/apps/contact/contact.html" },
  ];

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
          // } catch (error) {
            // console.error("Failed to open Instagram:", error);
            // Handle error (e.g., show a fallback message or log)
          // const fakeEvent = { target: { closest: () => ({ dataset: { action: 'open-url', url: 'https://www.instagram.com/mitchivin' } }) }, stopPropagation: () => {}, preventDefault: () => {} };
          // startMenu._handleMenuClick(fakeEvent);
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
