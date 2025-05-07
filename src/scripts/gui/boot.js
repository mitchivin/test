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
    desktop.style.opacity = "0";
    desktop.style.pointerEvents = "none";
    loginScreen.style.display = "none";
    loginScreen.style.opacity = "0";
    loginScreen.style.pointerEvents = "none";
    if (crtScanline) crtScanline.style.display = "none";
    if (crtVignette) crtVignette.style.display = "none";
    if (!bootScreen) return;
    bootScreen.style.display = "flex";
    bootScreen.style.opacity = "1";
    bootScreen.style.pointerEvents = "auto";

    const minBootTime = 3000; // 3 seconds minimum
    const bootStart = Date.now();

    preloadAssets().then(() => {
      const elapsed = Date.now() - bootStart;
      const remaining = Math.max(0, minBootTime - elapsed);
    setTimeout(() => {
      bootScreen.style.display = "none";
      if (isMobileDevice()) {
        handleLoginSuccess();
      } else {
        loginScreen.style.display = "flex";
        loginScreen.style.opacity = "1";
        loginScreen.style.pointerEvents = "auto";
        const loginContent = loginScreen.querySelector(".login-screen");
        if (loginContent) {
          loginContent.style.opacity = "1";
        }
        attachLoginScreenHandlers();
      }
      }, remaining);
    });
  }

  // Preload all critical assets for Projects app
  function preloadAssets() {
    // List of images and videos from projects.html
    const imageUrls = [
      "../../../assets/apps/projects/image1.webp",
      "../../../assets/apps/projects/carousel1.webp",
      "../../../assets/apps/projects/image2.webp",
      "../../../assets/apps/projects/image3.webp",
      "../../../assets/apps/projects/image4.webp",
      "../../../assets/apps/projects/image5.webp",
      "../../../assets/apps/projects/image6.webp",
    ];
    const videoUrls = [
      "../../../assets/apps/projects/video1.mp4",
      "../../../assets/apps/projects/video2.mp4",
      "../../../assets/apps/projects/video3.mp4",
    ];
    // Helper to preload an image
    function preloadImage(url) {
      return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = url;
      });
    }
    // Helper to preload a video (metadata only)
    function preloadVideo(url) {
      return new Promise((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => { cleanup(); resolve(); };
        video.onerror = () => { cleanup(); resolve(); };
        video.src = url;
        video.style.display = "none";
        document.body.appendChild(video);
        // Clean up after metadata is loaded or error
        function cleanup() {
          if (video.parentNode) video.parentNode.removeChild(video);
        }
      });
    }
    // Preload all assets
    const imagePromises = imageUrls.map(preloadImage);
    const videoPromises = videoUrls.map(preloadVideo);
    return Promise.all([...imagePromises, ...videoPromises]);
  }

  /**
   * Handle successful login from login iframe
   * @private
   */
  function handleLoginSuccess() {
    loginScreen.style.display = "none";
    loginScreen.style.pointerEvents = "none";
    loginScreen.style.opacity = "0";
    desktop.style.opacity = "1";
    desktop.style.pointerEvents = "auto";
    if (crtScanline) crtScanline.style.display = "block";
    if (crtVignette) crtVignette.style.display = "block";
    document.dispatchEvent(new CustomEvent("reinitScanline"));
    if (!isMobileDevice()) {
      try {
        const loginSound = new Audio("./assets/sounds/login.wav");
        loginSound.currentTime = 0;
        loginSound.play();
      } catch {}
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
  }

  // Event listener for communication with login iframe
  window.addEventListener("message", (event) => {
    if (event.data?.type === "loginSuccess") {
      handleLoginSuccess();
    } else if (event.data?.type === "shutdownRequest") {
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
