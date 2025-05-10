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

import { showNetworkBalloon } from "./taskbar.js";
import { isMobileDevice } from "../utils/device.js";

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
  const bootScreen = document.getElementById("boot-screen");
  const loginScreen = document.getElementById("login-screen");
  const desktop = document.querySelector(".desktop");
  const crtScanline = document.querySelector(".crt-scanline");
  const crtVignette = document.querySelector(".crt-vignette");
  const urlParams = new URLSearchParams(window.location.search);
  const forceBoot = urlParams.get("forceBoot") === "true";

  if (forceBoot) {
    const newUrl = window.location.pathname + window.location.hash;
    history.replaceState({}, document.title, newUrl);
    sessionStorage.removeItem("logged_in");
    startBootSequence();
  } else {
    const hasLoggedIn = sessionStorage.getItem("logged_in") === "true";
    if (hasLoggedIn) {
      skipBootSequence();
    } else {
      startBootSequence();
    }
  }

  /**
   * Bypasses boot sequence for returning users
   * @private
   */
  function skipBootSequence() {
    bootScreen.style.display = "none";
    loginScreen.style.display = "none";
    desktop.style.opacity = "1";
    desktop.style.pointerEvents = "auto";
  }

  /**
   * Executes the full boot animation sequence
   * @private
   */
  function startBootSequence() {
    setTimeout(() => {
      desktop.style.opacity = "0";
      desktop.style.pointerEvents = "none";
      if (crtScanline) crtScanline.style.display = "none";
      if (crtVignette) crtVignette.style.display = "none";
      if (!bootScreen) return;
      bootScreen.style.display = "flex";
      bootScreen.style.opacity = "1";
      bootScreen.style.pointerEvents = "auto";

      const minBootTime = 5500; // 5.5 seconds minimum
      const bootFadeoutTime = 1000; // 1s for fadeout
      const bootStart = Date.now();

      setTimeout(() => {
        // Fade out boot screen elements first
        bootScreen.classList.remove("boot-fade-in");
        setTimeout(() => {
          // Fade overlay to black
          const fadeoutOverlay = document.getElementById("boot-fadeout-overlay");
          if (fadeoutOverlay) {
            fadeoutOverlay.style.display = "block";
            void fadeoutOverlay.offsetWidth;
            fadeoutOverlay.style.transition = "opacity 0.5s";
            fadeoutOverlay.style.opacity = "1";
            setTimeout(() => {
              // Overlay is now fully black. Hide boot, show login.
              bootScreen.style.display = "none";
              // Always show login screen, regardless of device
              loginScreen.style.display = "flex";
              loginScreen.style.opacity = "1";
              loginScreen.style.pointerEvents = "auto";
              const loginContent = loginScreen.querySelector(".login-screen");
              if (loginContent) loginContent.style.opacity = "1";
              attachLoginScreenHandlers();
              // Fade overlay out
              fadeoutOverlay.style.opacity = "0";
              setTimeout(() => {
                fadeoutOverlay.style.display = "none";
                // Do NOT call handleLoginSuccess() automatically for any device
              }, 500); // fade-out duration
            }, 150 + 1000); // 150ms fade to black, 1s fully black
          }
        }, 250); // Wait for boot element fade-out
      }, minBootTime - 150 - 1000 - 250); // Start fadeout 1.4s before boot ends
    }, 1000); // Delay boot by 1s for pre-boot overlay
  }

  /**
   * Handle successful login from login iframe
   * @private
   */
  function handleLoginSuccess() {
    // Always run the login and welcome sequence, even on mobile
    const loginContent = loginScreen.querySelector(".login-screen");
    const welcomeMsg = loginScreen.querySelector(".welcome-message");
    // Only fade out: .back-gradient (user icon/text), .turn-off, .right-bottom, .xp-logo-image, .left-text
    const fadeTargets = [
      loginContent.querySelector(".back-gradient"),
      loginContent.querySelector(".turn-off"),
      loginContent.querySelector(".right-bottom"),
      loginContent.querySelector(".xp-logo-image"),
      loginContent.querySelector(".left-text"),
      loginContent.querySelector(".login-separator.mobile-only")
    ];
    fadeTargets.forEach(el => {
      if (el) {
        el.style.transition = "opacity 0.15s";
        el.style.opacity = "0";
      }
    });
    // After fade out, wait 0.5s, then show welcome message
    setTimeout(() => {
      fadeTargets.forEach(el => { if (el) el.style.display = "none"; });
      // 0.5s delay before welcome fades in
      setTimeout(() => {
        welcomeMsg.style.display = "block";
        setTimeout(() => {
          welcomeMsg.classList.add("visible");
        }, 10);
      }, 500);
      // After welcome message is visible, proceed to desktop
      setTimeout(() => {
        welcomeMsg.classList.remove("visible");
        loginScreen.style.display = "none";
        loginScreen.style.pointerEvents = "none";
        loginScreen.style.opacity = "0";
        desktop.style.opacity = "1";
        desktop.style.pointerEvents = "auto";
        if (crtScanline) crtScanline.style.display = "block";
        if (crtVignette) crtVignette.style.display = "block";
        document.dispatchEvent(new CustomEvent("reinitScanline"));
        try {
          const loginSound = new Audio("./assets/sounds/login.wav");
          loginSound.currentTime = 0;
          loginSound.play();
        } catch {}
        sessionStorage.setItem("logged_in", "true");
        setTimeout(() => {
          if (
            typeof showNetworkBalloon === "function" &&
            !document.getElementById("balloon-root")
          ) {
            showNetworkBalloon();
          }
        }, 3000);
      }, 2000 + 500);
    }, 150); // Wait for fade out (0.15s)
  }

  // Event listener for communication with login iframe
  window.addEventListener("message", (event) => {
    if (event.data?.type === "shutdownRequest") {
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
    try {
      const logoffSound = new Audio("./assets/sounds/logoff.wav");
      logoffSound.play();
    } catch {}
    const balloon = document.getElementById("balloon-root");
    if (balloon && balloon.parentNode) {
      balloon.parentNode.removeChild(balloon);
    }
    loginScreen.style.display = "flex";
    loginScreen.style.opacity = "1";
    loginScreen.style.pointerEvents = "auto";
    desktop.style.opacity = "0";
    desktop.style.pointerEvents = "none";
    if (crtScanline) crtScanline.style.display = "none";
    if (crtVignette) crtVignette.style.display = "none";
    const loginContent = loginScreen.querySelector(".login-screen");
    if (loginContent) {
      loginContent.style.opacity = "1";
      loginContent.style.display = "block";
      loginContent.style.pointerEvents = "auto";
      // Restore all faded/hidden elements
      const restoreTargets = [
        loginContent.querySelector(".back-gradient"),
        loginContent.querySelector(".turn-off"),
        loginContent.querySelector(".right-bottom"),
        loginContent.querySelector(".xp-logo-image"),
        loginContent.querySelector(".left-text")
      ];
      restoreTargets.forEach(el => {
        if (el) {
          el.style.opacity = "1";
          el.style.display = "";
          el.style.transition = "";
        }
      });
    }
    // Hide welcome message if visible
    const welcomeMsg = loginScreen.querySelector(".welcome-message");
    if (welcomeMsg) {
      welcomeMsg.classList.remove("visible");
      welcomeMsg.style.display = "none";
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

document.addEventListener("DOMContentLoaded", () => {
  const preBoot = document.getElementById("pre-boot-overlay");
  const bootScreen = document.getElementById("boot-screen");
  if (preBoot && bootScreen) {
    setTimeout(() => {
      preBoot.parentNode.removeChild(preBoot);
      bootScreen.classList.add("boot-fade-in");
    }, 1000);
  }
});
