// ==================================================
//  Boot Sequence & Login Handling for Windows XP Simulation
// ==================================================
/**
 * @fileoverview Boot sequence and login handling for Windows XP simulation
 *
 * This module manages the boot animation sequence, login process, and session handling
 * for the Windows XP simulation. It controls transitions between boot screen, login
 * screen, and desktop, and handles session persistence.
 *
 * @module boot
 */

import { showNetworkBalloon } from "../gui/taskbar.js";
import { isMobileDevice } from "./device.js";

// =========================
// 1. Boot Sequence Initialization
// =========================
/**
 * Initializes the boot sequence for the Windows XP simulation
 *
 * @param {Object} eventBus - Event bus instance for pub/sub communication
 * @param {Object} EVENTS - Event name constants
 * @returns {void}
 */
export function initBootSequence(eventBus, EVENTS) {
  // DOM element references
  const bootScreen = document.getElementById("boot-screen");
  const loginScreen = document.getElementById("login-screen");
  const desktop = document.querySelector(".desktop");

  // CRT effect elements
  const crtScanline = document.querySelector(".crt-scanline");
  const crtVignette = document.querySelector(".crt-vignette");

  // Check URL parameters for boot control
  const urlParams = new URLSearchParams(window.location.search);
  const forceBoot = urlParams.get("forceBoot") === "true";

  if (forceBoot) {
    // Handle forced boot sequence (triggered by shutdown)
    // Clean URL to remove parameter
    const newUrl = window.location.pathname + window.location.hash;
    history.replaceState({}, document.title, newUrl);

    // Reset session state
    sessionStorage.removeItem("logged_in");
    startBootSequence();
  } else {
    // Check existing session state
    const hasLoggedIn = sessionStorage.getItem("logged_in") === "true";

    if (hasLoggedIn) {
      // Skip boot/login sequence if already logged in this session
      skipBootSequence();
    } else {
      // Start normal boot sequence for new session
      startBootSequence();
    }
  }

  /**
   * Bypasses boot sequence for returning users
   * @private
   */
  function skipBootSequence() {
    // Hide boot and login screens
    bootScreen.style.display = "none";
    loginScreen.style.display = "none";

    // Show desktop immediately
    desktop.style.opacity = "1";
    desktop.style.pointerEvents = "auto";
    // CRT effects remain visible by default CSS
  }

  /**
   * Executes the full boot animation sequence
   * @private
   */
  function startBootSequence() {
    // Ensure desktop is hidden during boot
    desktop.style.opacity = "0";
    desktop.style.pointerEvents = "none";

    // Ensure login screen is initially hidden
    loginScreen.style.display = "none";
    loginScreen.style.opacity = "0";
    loginScreen.style.pointerEvents = "none";

    // Hide CRT effects during boot animation
    if (crtScanline) crtScanline.style.display = "none";
    if (crtVignette) crtVignette.style.display = "none";

    // Activate boot screen
    if (!bootScreen) {
      return;
    }

    bootScreen.style.display = "flex";
    bootScreen.style.opacity = "1";
    bootScreen.style.pointerEvents = "auto";

    // Show boot screen for 5 seconds, then transition
    setTimeout(() => {
      // Hide the boot screen regardless of mobile or desktop path
      bootScreen.style.display = "none";

      // If mobile, skip login and go straight to desktop
      if (isMobileDevice()) {
        // Re-use the function that handles showing the desktop
        handleLoginSuccess();
      } else {
        // Original logic for non-mobile: show login screen
        loginScreen.style.display = "flex";
        loginScreen.style.opacity = "1";
        loginScreen.style.pointerEvents = "auto";
        // Fade in the login content only
        const loginContent = loginScreen.querySelector(".login-screen");
        if (loginContent) {
          loginContent.style.opacity = "1";
        }
        attachLoginScreenHandlers(); // Attach handlers only for non-mobile
      }
    }, 5000); // 5 second boot time
  }

  /**
   * Handle successful login from login iframe
   * @private
   */
  function handleLoginSuccess() {
    // Hide login screen
    loginScreen.style.display = "none";
    loginScreen.style.pointerEvents = "none";
    loginScreen.style.opacity = "0";

    // Show desktop and enable interaction
    desktop.style.opacity = "1";
    desktop.style.pointerEvents = "auto";
    // Restore CRT effects after login
    if (crtScanline) crtScanline.style.display = "block";
    if (crtVignette) crtVignette.style.display = "block";

    // Trigger a custom event to reinitialize scanline animation
    document.dispatchEvent(new CustomEvent("reinitScanline"));

    // Play login sound only on non-mobile devices
    if (!isMobileDevice()) {
      try {
        const loginSound = new Audio("./assets/sounds/login.wav");
        loginSound.currentTime = 0;
        loginSound.play();
      } catch {
        // Error handling removed as 'e' was unused and block was empty
      }
    }

    // Persist login state for this session
    sessionStorage.setItem("logged_in", "true");

    // Show network balloon after login, with 3s delay
    setTimeout(() => {
      if (
        typeof showNetworkBalloon === "function" &&
        !document.getElementById("balloon-root")
      ) {
        showNetworkBalloon();
      }
    }, 3000);
  }

  // Event listener for communication with login iframe
  window.addEventListener("message", (event) => {
    // Security note: Consider adding origin validation in production
    // if (event.origin !== window.origin) return;

    if (event.data?.type === "loginSuccess") {
      handleLoginSuccess();
    } else if (event.data?.type === "shutdownRequest") {
      // Propagate shutdown request to main event system
      if (eventBus && EVENTS) {
        eventBus.publish(EVENTS.SHUTDOWN_REQUESTED);
      }
    }
  });

  // Set up log off event handler
  if (!eventBus || !EVENTS) {
    return;
  }

  /**
   * Handle log off request
   * Shows login screen without full reboot
   */
  eventBus.subscribe(EVENTS.LOG_OFF_REQUESTED, () => {
    // Play logoff sound
    try {
      const logoffSound = new Audio("./assets/sounds/logoff.wav");
      logoffSound.play();
    } catch {
      // Error handling removed as 'e' was unused and block was empty
    }

    // Hide the balloon if it is showing
    const balloon = document.getElementById("balloon-root");
    if (balloon && balloon.parentNode) {
      balloon.parentNode.removeChild(balloon);
    }

    // Show login screen instantly
    loginScreen.style.display = "flex";
    loginScreen.style.opacity = "1";
    loginScreen.style.pointerEvents = "auto";
    desktop.style.opacity = "0";
    desktop.style.pointerEvents = "none";
    if (crtScanline) crtScanline.style.display = "none";
    if (crtVignette) crtVignette.style.display = "none";
    // Also ensure the login content is visible
    const loginContent = loginScreen.querySelector(".login-screen");
    if (loginContent) {
      loginContent.style.opacity = "1";
      loginContent.style.display = "block";
      loginContent.style.pointerEvents = "auto";
    }
    sessionStorage.setItem("logged_in", "false");
    attachLoginScreenHandlers();
  });

  /**
   * Attach login and shutdown event listeners to the login screen elements
   * Ensures listeners are attached every time the login screen is shown
   */
  function attachLoginScreenHandlers() {
    const profileElement = document.querySelector(".back-gradient");
    if (profileElement && !profileElement._loginHandlerAttached) {
      profileElement.addEventListener("click", function () {
        profileElement.classList.add("active");
        handleLoginSuccess();
      });
      profileElement._loginHandlerAttached = true;
    }
    const shutdownIcon = document.getElementById("shutdown-icon");
    if (shutdownIcon && !shutdownIcon._shutdownHandlerAttached) {
      shutdownIcon.addEventListener("click", () => {
        if (eventBus && EVENTS) {
          eventBus.publish(EVENTS.SHUTDOWN_REQUESTED);
        }
      });
      shutdownIcon._shutdownHandlerAttached = true;
    }
  }
}

// ==================================================
// END Boot Sequence Module
// ==================================================
