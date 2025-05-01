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
import { isMobileDevice } from "./utils/device.js";

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

  // Pinch-to-zoom overlay logic for mobile
  if (isMobileDevice()) {
    let overlay = document.getElementById('zoom-overlay');
    let zooming = false;
    let lastScale = 1;
    window.addEventListener('touchmove', function(event) {
      if (event.touches.length === 2 && event.scale !== undefined && event.scale !== 1) {
        overlay.style.display = 'block';
        zooming = true;
        lastScale = event.scale;
      }
    }, { passive: false });
    window.addEventListener('touchend', function(event) {
      if (zooming) {
        overlay.style.display = 'none';
        zooming = false;
        lastScale = 1;
      }
    });
    window.addEventListener('touchcancel', function(event) {
      if (zooming) {
        overlay.style.display = 'none';
        zooming = false;
        lastScale = 1;
      }
    });
  }
});
