/*
 * crtEffect.js — CRT effect utilities for Windows XP simulation.
 * Handles initialization and management of CRT scanline effects using CSS transitions and randomized timing.
 * @file src/scripts/utils/crtEffect.js
 */

// ==================================================
//  CRT Effect Utilities for Windows XP Simulation
// ==================================================

// CRT Effect: Combined CSS and JS

// ===== CRT Effect Configuration =====
// Defines the timing parameters for the CRT scanline animation to create a randomized, natural feel.

// Animation timing constants for CRT scanline effect
const SCANLINE_MIN_DELAY_MS = 1000; // Minimum delay in milliseconds before a scanline animation cycle starts.
const SCANLINE_MAX_DELAY_MS = 3000; // Maximum additional random delay in milliseconds before a scanline animation cycle starts.
const SCANLINE_BASE_DURATION_MS = 3000; // Base duration in milliseconds for the scanline to traverse the screen.
const SCANLINE_DURATION_RANDOM_ADDITION_MS = 1000; // Maximum additional random duration in milliseconds for the scanline traversal.

// ===== CRT Scanline Effect Initialization =====
/**
 * Initializes and manages the moving scanline CRT effect.
 * This function targets an HTML element with the class `.crt-scanline`.
 * It creates a randomly timed animation of this scanline moving vertically
 * across the screen. The animation uses CSS transitions with randomized delays
 * and durations to simulate a natural CRT monitor effect. The animation typically
 * starts after the user logs in or interacts with the desktop.
 * It also listens for a custom "reinitScanline" event to restart the animation.
 * Assumes a `.desktop` element exists for initial click interaction.
 */
export function initRandomScanline() {
  const scanline = document.querySelector(".crt-scanline");
  if (!scanline) return;

  let isAnimationStarted = false; // Flag to track if the initial scanline animation has begun.

  // Event listener for when the scanline transition ends to reset and restart the animation cycle.
  scanline.addEventListener("transitionend", () => {
    scanline.style.transition = "none"; // Disable transition for immediate repositioning.
    scanline.style.transform = "translateY(-10px)"; // Move scanline off-screen to the top.
    // Calculate a random delay for the next animation cycle.
    const nextInterval =
      SCANLINE_MIN_DELAY_MS + Math.random() * SCANLINE_MAX_DELAY_MS;
    setTimeout(startAnimation, nextInterval); // Schedule the next animation.
  });

  /**
   * Triggers the scanline animation by setting its CSS transition and transform properties.
   * This function forces a reflow before applying the transition to ensure it plays correctly.
   */
  function startAnimation() {
    void scanline.offsetWidth; // Force a reflow to ensure the transition is applied correctly after style changes.
    // Calculate a random duration for the current animation cycle.
    const duration =
      SCANLINE_BASE_DURATION_MS +
      Math.random() * SCANLINE_DURATION_RANDOM_ADDITION_MS;
    scanline.style.transition = `transform ${duration}ms linear`; // Set the transition properties.
    scanline.style.transform = "translateY(100vh)"; // Animate the scanline to the bottom of the viewport.
    isAnimationStarted = true; // Mark that the animation has started.
  }

  // Event listener for the first click on the desktop to initiate the scanline animation.
  document.querySelector(".desktop").addEventListener(
    "click",
    () => {
      if (!isAnimationStarted) {
        startAnimation(); // Start animation only if it hasn't already started.
      }
    },
    { once: true }, // Ensure this listener only fires once.
  );

  // Event listener for a custom event to reinitialize/restart the scanline animation.
  document.addEventListener("reinitScanline", () => {
    setTimeout(startAnimation, 500); // Restart animation after a short delay.
  });

  // Check session storage if user is already logged in to start animation immediately.
  if (sessionStorage.getItem("logged_in") === "true") {
    setTimeout(startAnimation, 500); // Start animation if user is logged in.
  }
}

// ==================================================
// END CRT Effect Utilities
// ==================================================
