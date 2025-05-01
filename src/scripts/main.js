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
});
