/**
 * @fileoverview Entry point for the Windows XP simulation that initializes all core components
 * and sets up event handling. This file orchestrates the application's lifecycle.
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

document.addEventListener("DOMContentLoaded", () => {
  new Taskbar(eventBus);
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
