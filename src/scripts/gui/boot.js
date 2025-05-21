// ==================================================
//  boot.js — Boot Sequence & Login Handling for Windows XP Simulation
//  Handles boot animation, login process, session state, and event-driven logoff/shutdown.
// ==================================================
/**
 * Handles the boot animation, login process, and session state for the Windows XP simulation.
 * - Manages transitions between boot, login, and desktop screens.
 * - Handles session persistence and event-driven logoff/shutdown.
 * - Integrates with the event bus for cross-component communication.
 *
 * @module boot
 */

import { showNetworkBalloon } from "./taskbar.js";

let SYSTEM_ASSETS = null;
async function getSystemAssets() {
  if (SYSTEM_ASSETS) return SYSTEM_ASSETS;
  try {
    const response = await fetch("./system.json");
    SYSTEM_ASSETS = await response.json();
    return SYSTEM_ASSETS;
  } catch (e) {
    SYSTEM_ASSETS = {};
    return SYSTEM_ASSETS;
  }
}

// ===== Boot Sequence Initialization =====
/**
 * Initialize the boot sequence and login handling.
 * @param {Object} eventBus - Pub/sub event bus instance
 * @param {Object} EVENTS - Event name constants
 */
export function initBootSequence(eventBus, EVENTS) {
  const bootScreen = document.getElementById("boot-screen");
  const loginScreen = document.getElementById("login-screen");
  const desktop = document.querySelector(".desktop");
  const crtScanline = document.querySelector(".crt-scanline");
  const crtVignette = document.querySelector(".crt-vignette");
  const bootDelayMessage = document.getElementById("boot-delay-message");
  const urlParams = new URLSearchParams(window.location.search);
  const forceBoot = urlParams.get("forceBoot") === "true";
  let delayMessageTimer = null; // Store timer ID to clear it

  // Preload login and logoff sounds for instant playback
  const loginSound = new Audio("./assets/sounds/login.wav");
  const logoffSound = new Audio("./assets/sounds/logoff.wav");
  loginSound.load();
  logoffSound.load();

  // Boot logic: force boot, skip for returning users, or run full sequence
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
   * Instantly show desktop for returning users (bypass boot/login)
   */
  function skipBootSequence() {
    bootScreen.style.display = "none";
    loginScreen.style.display = "none";
    desktop.style.opacity = "1";
    desktop.style.pointerEvents = "auto";
    if (bootDelayMessage) bootDelayMessage.style.display = "none";
    if (delayMessageTimer) clearTimeout(delayMessageTimer); // Clear timer if boot is skipped
  }

  /**
   * Run the animated boot sequence, then show login screen.
   */
  function startBootSequence() {
    setTimeout(async () => {
      desktop.style.opacity = "0";
      desktop.style.pointerEvents = "none";
      if (crtScanline) crtScanline.style.display = "none";
      if (crtVignette) crtVignette.style.display = "none";
      if (!bootScreen) return;

      // Get system assets and set the boot logo
      const system = await getSystemAssets();
      const bootLogoElement = document.getElementById("boot-logo");
      if (bootLogoElement && system && system.loading) {
        bootLogoElement.src = system.loading;
      }

      bootScreen.style.display = "flex";
      bootScreen.style.opacity = "1";
      bootScreen.style.pointerEvents = "auto";

      // Timer for the delay message
      delayMessageTimer = setTimeout(() => {
        if (bootScreen.style.display === "flex" && bootDelayMessage) {
          bootDelayMessage.style.opacity = "0";
          bootDelayMessage.style.transition = "opacity 0.5s ease-in-out";
          bootDelayMessage.style.display = "block";
          void bootDelayMessage.offsetWidth;
          bootDelayMessage.style.opacity = "1";
        }
      }, 5000); // Set to 5 seconds

      const minBootTime = 5500; // Minimum boot duration (ms)
      setTimeout(() => {
        // Before starting the fade-to-black, remove the delay message if it exists
        if (bootDelayMessage && bootDelayMessage.parentNode) {
          bootDelayMessage.parentNode.removeChild(bootDelayMessage);
        }
        clearTimeout(delayMessageTimer); // Clear the timer for showing the message as it's now removed

        bootScreen.classList.remove("boot-fade-in");
        setTimeout(() => {
          // Fade to black overlay, then show login
          const fadeoutOverlay = document.getElementById(
            "boot-fadeout-overlay",
          );
          if (fadeoutOverlay) {
            fadeoutOverlay.style.display = "block";
            void fadeoutOverlay.offsetWidth;
            fadeoutOverlay.style.transition = "opacity 0.5s";
            fadeoutOverlay.style.opacity = "1";

            setTimeout(() => {
              bootScreen.style.display = "none";
              loginScreen.style.display = "flex";
              loginScreen.style.opacity = "1";
              loginScreen.style.pointerEvents = "auto";
              const loginContent = loginScreen.querySelector(".login-screen");
              if (loginContent) loginContent.style.opacity = "1";
              attachLoginScreenHandlers();
              fadeoutOverlay.style.opacity = "0";
              if (bootDelayMessage && bootDelayMessage.parentNode) {
                bootDelayMessage.parentNode.removeChild(bootDelayMessage);
              }
              if (delayMessageTimer) {
                clearTimeout(delayMessageTimer);
                delayMessageTimer = null;
              }
              setTimeout(() => {
                fadeoutOverlay.style.display = "none";
              }, 500);
            }, 1150); // 150ms fade + 1s black
          }
        }, 250);
      }, minBootTime - 1400); // Start fadeout before boot ends
    }, 1000); // Pre-boot overlay delay
  }

  /**
   * Handle successful login: fade out login, show welcome, then desktop.
   */
  function handleLoginSuccess() {
    const loginContent = loginScreen.querySelector(".login-screen");
    const welcomeMsg = loginScreen.querySelector(".welcome-message");
    const fadeTargets = [
      loginContent.querySelector(".back-gradient"),
      loginContent.querySelector(".turn-off"),
      loginContent.querySelector(".right-bottom"),
      loginContent.querySelector(".xp-logo-image"),
      loginContent.querySelector(".left-text"),
      loginContent.querySelector(".login-separator.mobile-only"),
    ];
    fadeTargets.forEach((el) => {
      if (el) {
        el.style.transition = "opacity 0.15s";
        el.style.opacity = "0";
      }
    });
    setTimeout(() => {
      fadeTargets.forEach((el) => {
        if (el) el.style.display = "none";
      });
      setTimeout(() => {
        welcomeMsg.style.display = "block";
        setTimeout(() => {
          welcomeMsg.classList.add("visible");
        }, 10);
      }, 500); // Welcome message appears after this delay
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
          loginSound.currentTime = 0;
          loginSound.play();
        } catch {
          /* intentionally empty */
        }
        sessionStorage.setItem("logged_in", "true");
        setTimeout(() => {
          if (
            typeof showNetworkBalloon === "function" &&
            !document.getElementById("balloon-root")
          ) {
            showNetworkBalloon();
          }
        }, 3000);
        // Block logoff button for 5 seconds after successful login
        window._logoffEnableTime = Date.now() + 5000;
      }, 2500);
    }, 150);

    // Preload critical assets for About and Resume apps
    const appCriticalAssets = [
      // Resume App
      { path: "./assets/apps/resume/resume.webp", type: "image" },
      { path: "./assets/apps/resume/resumeMitchIvin.pdf", type: "document" },
      // About App
      { path: "./assets/gui/bgs/aboutbg.webp", type: "image" },
      { path: "./assets/apps/about/pullup-alt.webp", type: "image" },
      { path: "./assets/apps/about/pullup.webp", type: "image" },
      { path: "./assets/apps/about/skill1.webp", type: "image" },
      { path: "./assets/apps/about/skill2.webp", type: "image" },
      { path: "./assets/apps/about/skill3.webp", type: "image" },
      { path: "./assets/apps/about/skill4.webp", type: "image" },
      { path: "./assets/apps/about/skill5.webp", type: "image" },
      { path: "./assets/apps/about/software1.webp", type: "image" },
      { path: "./assets/apps/about/software2.webp", type: "image" },
      { path: "./assets/apps/about/software3.webp", type: "image" },
      { path: "./assets/apps/about/software4.webp", type: "image" },
      { path: "./assets/apps/about/p1.webp", type: "image" },
      { path: "./assets/apps/about/p2.webp", type: "image" },
      { path: "./assets/apps/about/p3.webp", type: "image" },
      { path: "./assets/apps/about/p4.webp", type: "image" },
      { path: "./assets/apps/about/p5.webp", type: "image" },
      // Toolbar Icons
      { path: "./assets/gui/toolbar/barlogo.webp", type: "image" },
      { path: "./assets/gui/toolbar/back.webp", type: "image" },
      { path: "./assets/gui/toolbar/copy.webp", type: "image" },
      { path: "./assets/gui/toolbar/cut.webp", type: "image" },
      { path: "./assets/gui/toolbar/delete.webp", type: "image" },
      { path: "./assets/gui/toolbar/forward.webp", type: "image" },
      { path: "./assets/gui/toolbar/go.webp", type: "image" },
      { path: "./assets/gui/toolbar/home.webp", type: "image" },
      { path: "./assets/gui/toolbar/new.webp", type: "image" },
      { path: "./assets/gui/toolbar/paste.webp", type: "image" },
      { path: "./assets/gui/toolbar/print.webp", type: "image" },
      { path: "./assets/gui/toolbar/save.webp", type: "image" },
      { path: "./assets/gui/toolbar/search.webp", type: "image" },
      { path: "./assets/gui/toolbar/send.webp", type: "image" },
      { path: "./assets/gui/toolbar/tooldropdown.webp", type: "image" },
      { path: "./assets/gui/toolbar/up.webp", type: "image" },
      { path: "./assets/gui/toolbar/views.webp", type: "image" },
      { path: "./assets/gui/toolbar/desc.webp", type: "image" },
    ];

    appCriticalAssets.forEach((asset) => {
      const img = new Image();
      img.src = asset.path;
      img.onload = () => {};
      img.onerror = () => {};
    });
  }

  // Listen for shutdown requests from login iframe
  window.addEventListener("message", (event) => {
    if (event.data?.type === "shutdownRequest") {
      if (eventBus && EVENTS) {
        eventBus.publish(EVENTS.SHUTDOWN_REQUESTED);
      }
    }
  });

  // Log off: show login screen, hide desktop, reset session
  if (!eventBus || !EVENTS) return;

  // Listen for request to show logoff confirmation dialog
  eventBus.subscribe(EVENTS.LOG_OFF_CONFIRMATION_REQUESTED, () => {
    showLogoffDialog();
  });

  eventBus.subscribe(EVENTS.LOG_OFF_REQUESTED, () => {
    try {
      logoffSound.currentTime = 0;
      logoffSound.play();
    } catch {
      /* intentionally empty */
    }
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
        loginContent.querySelector(".left-text"),
        loginContent.querySelector(".login-separator.mobile-only"),
      ];
      restoreTargets.forEach((el) => {
        if (el) {
          if (
            el.classList.contains("login-separator") &&
            el.classList.contains("mobile-only")
          ) {
            el.style.opacity = "0.25";
          } else {
            el.style.opacity = "1";
          }
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
   * Attach login and shutdown event listeners to login screen elements.
   * Ensures listeners are attached every time the login screen is shown.
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

  // ===== Log Off Dialog Management =====
  const logoffDialog = document.getElementById("logoff-dialog-container");
  const logoffLogOffBtn = document.getElementById("logoff-log-off-btn");
  const logoffSwitchUserBtn = document.getElementById("logoff-switch-user-btn");
  const logoffCancelBtn = document.getElementById("logoff-cancel-btn");
  let grayscaleTimeoutId = null;

  function showLogoffDialog() {
    if (!logoffDialog) return;
    logoffDialog.classList.remove("logoff-dialog-hidden");
    requestAnimationFrame(() => {
      logoffDialog.classList.add("visible");
    });

    // Permanently disable Switch User button
    if (logoffSwitchUserBtn) {
      logoffSwitchUserBtn.style.pointerEvents = "none";
      logoffSwitchUserBtn.style.opacity = "0.6"; // Visually disable
      // The 'disabled' class is already added in HTML, CSS can style it further
    }

    // Disable Log Off button if within 5 seconds of login
    if (logoffLogOffBtn) {
      const now = Date.now();
      const enableTime = window._logoffEnableTime || 0;
      if (now < enableTime) {
        logoffLogOffBtn.classList.add("logoff-button-timed-disable");
        logoffLogOffBtn.style.pointerEvents = "none";
        logoffLogOffBtn.style.opacity = "0.6";
        setTimeout(() => {
          logoffLogOffBtn.classList.remove("logoff-button-timed-disable");
          logoffLogOffBtn.style.pointerEvents = "";
          logoffLogOffBtn.style.opacity = "";
        }, enableTime - now);
      } else {
        logoffLogOffBtn.classList.remove("logoff-button-timed-disable");
        logoffLogOffBtn.style.pointerEvents = "";
        logoffLogOffBtn.style.opacity = "";
      }
    }

    // Delay before applying grayscale effect
    clearTimeout(grayscaleTimeoutId);
    grayscaleTimeoutId = setTimeout(() => {
      document.body.classList.add("screen-grayscale-active");
    }, 700); // 700ms delay
  }

  function hideLogoffDialog() {
    if (!logoffDialog) return;
    logoffDialog.classList.remove("visible");
    logoffDialog.classList.add("logoff-dialog-hidden"); // Re-hide it properly

    document.body.classList.remove("screen-grayscale-active");
    clearTimeout(grayscaleTimeoutId); // Clear timeout if dialog is hidden before it fires
  }

  if (logoffLogOffBtn) {
    const imgEl = logoffLogOffBtn.querySelector("img");
    const spanEl = logoffLogOffBtn.querySelector("span");
    const logOffAction = (event) => {
      event.stopPropagation(); // Prevent click from bubbling
      hideLogoffDialog();
      eventBus.publish(EVENTS.LOG_OFF_REQUESTED);
    };
    if (imgEl) imgEl.addEventListener("click", logOffAction);
    if (spanEl) spanEl.addEventListener("click", logOffAction);
  }

  if (logoffCancelBtn) {
    logoffCancelBtn.addEventListener("click", () => {
      hideLogoffDialog();
    });
  }
}

// ==================================================
// END Boot Sequence Module
// ==================================================

// On DOMContentLoaded, fade in boot screen and remove pre-boot overlay
// (This is a visual polish step, not part of the main boot logic)
document.addEventListener("DOMContentLoaded", async () => {
  const system = await getSystemAssets();
  // Boot screen loading spinner
  const bootLogo = document.getElementById("boot-logo");
  if (bootLogo && system.loading) bootLogo.src = system.loading;
  // Login screen XP logo
  document.querySelectorAll(".xp-logo-image").forEach(img => {
    if (system.loading) img.src = system.loading;
  });
  // Login screen user icon
  document.querySelectorAll('.login-screen .user img').forEach(img => {
    if (system.userIcon) img.src = system.userIcon;
  });
  // Set login screen name from info.json
  try {
    const response = await fetch("./info.json");
    const info = await response.json();
    const name = info?.contact?.name || "Mitch Ivin";
    document.querySelectorAll('.login-screen .name').forEach(span => {
      span.textContent = name;
    });
    // Update only the name in the login instruction
    document.querySelectorAll('.login-instruction-name').forEach(span => {
      span.textContent = name;
    });
  } catch (e) {}
  const preBoot = document.getElementById("pre-boot-overlay");
  const bootScreen = document.getElementById("boot-screen");
  if (preBoot && bootScreen) {
    setTimeout(() => {
      preBoot.parentNode.removeChild(preBoot);
      bootScreen.classList.add("boot-fade-in");
    }, 1000);
  }
});
