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
import { initBootSequence } from "./utils/boot.js"; // Import the boot sequence initializer
import { setupTooltips } from "./utils/tooltip.js";
import { initRandomScanline } from "./utils/crtEffect.js";

document.addEventListener("DOMContentLoaded", () => {
  // Initialize core UI components with shared event bus for communication
  new Taskbar(eventBus);
  new Desktop(eventBus);
  new WindowManager(eventBus);

  // Initialize boot/login sequence after component initialization
  // IMPORTANT: Must be called after eventBus initialization
  initBootSequence(eventBus, EVENTS);

  // Handle system shutdown requests
  // Confirmation dialog intentionally omitted for streamlined UX
  eventBus.subscribe(EVENTS.SHUTDOWN_REQUESTED, () => {
    sessionStorage.removeItem("logged_in");
    // Navigate with a parameter to force boot sequence on reload
    const currentPath = window.location.pathname;
    window.location.assign(currentPath + "?forceBoot=true");
  });

  // Initialize CRT visual effects
  initRandomScanline();

  // Enable XP-style tooltips globally for all elements with data-tooltip
  setupTooltips("[data-tooltip]");

  // Landscape block overlay for mobile
  ensureLandscapeBlock();
  handleOrientationBlock();
  window.addEventListener('orientationchange', handleOrientationBlock);
  window.addEventListener('resize', handleOrientationBlock);

  // Set --real-vh CSS variable for true viewport height on mobile
  setRealVh();

  // Dynamically scale desktop icons to fit the row on mobile with gap
  scaleDesktopIconsToFitMobile();
});

// Landscape block overlay for mobile
function ensureLandscapeBlock() {
  if (!document.getElementById('landscape-block')) {
    const block = document.createElement('div');
    block.id = 'landscape-block';
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
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const isLandscape = window.matchMedia('(orientation: landscape)').matches;
  const block = document.getElementById('landscape-block');
  if (block) {
    block.style.display = (isMobile && isLandscape) ? 'flex' : 'none';
  }
}

// Set --real-vh CSS variable for true viewport height on mobile
function setRealVh() {
  const vh = (window.visualViewport ? window.visualViewport.height : window.innerHeight) * 0.01;
  document.documentElement.style.setProperty('--real-vh', `${vh}px`);
}

// Dynamically scale desktop icons to fit the row on mobile with gap
function scaleDesktopIconsToFitMobile() {
  const container = document.querySelector('.desktop-icons');
  if (!container) return;
  const icons = Array.from(container.children).filter(child => child.classList.contains('desktop-icon'));
  if (icons.length === 0) return;

  const gap = 8; // px, must match your CSS
  const iconWidth = 90; // px, must match your CSS
  const availableWidth = container.offsetWidth;
  const totalIconWidth = icons.length * iconWidth + (icons.length - 1) * gap;
  // Calculate scale factor (never above 1)
  const scale = Math.min(1, availableWidth / totalIconWidth);
  container.style.setProperty('--icon-scale', scale);
}
