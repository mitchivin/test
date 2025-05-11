// ==================================================
//  boot.js — Boot Sequence & Login Handling for Windows XP Simulation
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
  const urlParams = new URLSearchParams(window.location.search);
  const forceBoot = urlParams.get("forceBoot") === "true";

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
  }

  /**
   * Run the animated boot sequence, then show login screen.
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

      const minBootTime = 5500; // Minimum boot duration (ms)
      setTimeout(() => {
        bootScreen.classList.remove("boot-fade-in");
        setTimeout(() => {
          // Fade to black overlay, then show login
          const fadeoutOverlay = document.getElementById("boot-fadeout-overlay");
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
      loginContent.querySelector(".login-separator.mobile-only")
    ];
    fadeTargets.forEach(el => {
      if (el) {
        el.style.transition = "opacity 0.15s";
        el.style.opacity = "0";
      }
    });
    setTimeout(() => {
      fadeTargets.forEach(el => { if (el) el.style.display = "none"; });
      setTimeout(() => {
        welcomeMsg.style.display = "block";
        setTimeout(() => {
          welcomeMsg.classList.add("visible");
        }, 10);

        // Preload/Prefetch apps
        const appHtmlFiles = [
          { path: './src/apps/about/about.html', type: 'document' },
          { path: './src/apps/projects/projects.html', type: 'document' },
          { path: './src/apps/resume/resume.html', type: 'document' },
          { path: './src/apps/contact/contact.html', type: 'document' }
        ];

        appHtmlFiles.forEach(app => {
          const link = document.createElement('link');
          link.rel = 'prefetch'; // Use prefetch for documents
          link.href = app.path;
          link.as = app.type; // 'document'
          document.head.appendChild(link);
          console.log(`Prefetching ${app.type}: ${app.path}`);
        });

        // Preload critical assets for About and Resume apps
        const appCriticalAssets = [
          // Resume App
          { path: './assets/apps/resume/resume.webp', type: 'image' },
          { path: './assets/apps/resume/resumeMitchIvin.pdf', type: 'document' },
          // About App
          { path: './assets/apps/about/aboutbg.webp', type: 'image' },
          { path: './assets/apps/about/pullup-alt.webp', type: 'image' },
          { path: './assets/apps/about/pullup.webp', type: 'image' },
          { path: './assets/apps/about/skill1.webp', type: 'image' },
          { path: './assets/apps/about/skill2.webp', type: 'image' },
          { path: './assets/apps/about/skill3.webp', type: 'image' },
          { path: './assets/apps/about/skill4.webp', type: 'image' },
          { path: './assets/apps/about/skill5.webp', type: 'image' },
          { path: './assets/apps/about/software1.webp', type: 'image' },
          { path: './assets/apps/about/software2.webp', type: 'image' },
          { path: './assets/apps/about/software3.webp', type: 'image' },
          { path: './assets/apps/about/software4.webp', type: 'image' },
          { path: './assets/apps/about/p1.webp', type: 'image' },
          { path: './assets/apps/about/p2.webp', type: 'image' },
          { path: './assets/apps/about/p3.webp', type: 'image' },
          { path: './assets/apps/about/p4.webp', type: 'image' },
          { path: './assets/apps/about/p5.webp', type: 'image' }
        ];

        appCriticalAssets.forEach(asset => {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.href = asset.path;
          link.as = asset.type; // 'image'
          // For images, you can also specify media queries or imagesrcset/imagesizes if needed
          // but for these specific items, a simple preload is likely sufficient.
          document.head.appendChild(link);
          console.log(`Preloading ${asset.type}: ${asset.path}`);
        });

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
      }, 2500);
    }, 150);
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
  eventBus.subscribe(EVENTS.LOG_OFF_REQUESTED, () => {
    try {
      logoffSound.currentTime = 0;
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
        loginContent.querySelector(".left-text"),
        loginContent.querySelector(".login-separator.mobile-only")
      ];
      restoreTargets.forEach(el => {
        if (el) {
          if (el.classList.contains('login-separator') && el.classList.contains('mobile-only')) {
            el.style.opacity = '0.25';
          } else {
            el.style.opacity = '1';
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
}

// ==================================================
// END Boot Sequence Module
// ==================================================

// On DOMContentLoaded, fade in boot screen and remove pre-boot overlay
// (This is a visual polish step, not part of the main boot logic)
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
