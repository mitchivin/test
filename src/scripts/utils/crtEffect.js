// ==================================================
//  CRT Effect Utilities for Windows XP Simulation
// ==================================================
/**
 * @fileoverview CRT visual effect utilities for Windows XP simulation.
 * Handles CSS injection and scanline/flicker animation logic.
 *
 * Usage:
 *   import { initRandomScanline } from './crtEffect.js';
 *   initRandomScanline();
 */

// CRT Effect: Combined CSS and JS

// Removed large CSS string and injection logic

// Animation timing constants for CRT scanline effect
const SCANLINE_MIN_DELAY_MS = 1000; // Minimum delay between scanline animations (ms)
const SCANLINE_MAX_DELAY_MS = 3000; // Maximum additional random delay (ms)
const SCANLINE_MIN_DURATION_MS = 4000; // Minimum scanline animation duration (ms)
const SCANLINE_MAX_DURATION_MS = 3000; // Maximum additional random duration (ms)

/**
 * Initializes and manages the moving scanline CRT effect
 *
 * @description Creates a randomly timed animation of a scanline moving vertically
 * across the screen to simulate a CRT monitor effect. Uses CSS transitions with
 * random timing for natural variation.
 *
 * @export
 * @returns {void}
 */
export function initRandomScanline() {
  const scanline = document.querySelector(".crt-scanline");
  if (!scanline) return; // Graceful exit if element doesn't exist

  let isAnimationStarted = false;

  // Handle transition completion and schedule next animation
  scanline.addEventListener("transitionend", () => {
    // Reset scanline position without animation
    scanline.style.transition = "none";
    scanline.style.transform = "translateY(-10px)";

    // Random delay between animations (1-3 seconds)
    // PERF: Longer intervals reduce visual processing overhead
    const nextInterval =
      SCANLINE_MIN_DELAY_MS + Math.random() * SCANLINE_MAX_DELAY_MS;
    setTimeout(startAnimation, nextInterval);
  });

  /**
   * Begins a new scanline animation cycle
   * @private
   */
  function startAnimation() {
    // Force browser reflow to ensure position reset is applied
    // This prevents transition glitches between animation cycles
    void scanline.offsetWidth;

    // Random duration creates natural variation (4-7 seconds)
    const duration =
      SCANLINE_MIN_DURATION_MS + Math.random() * SCANLINE_MAX_DURATION_MS;

    // Apply the animation with dynamic duration
    scanline.style.transition = `transform ${duration}ms linear`;
    scanline.style.transform = "translateY(100vh)";

    isAnimationStarted = true;
  }

  // Start animation on first desktop click
  document.querySelector(".desktop").addEventListener(
    "click",
    () => {
      if (!isAnimationStarted) {
        startAnimation();
      }
    },
    { once: true },
  );

  // Listen for login success and reinitialize animation
  document.addEventListener("reinitScanline", () => {
    // Start the animation after a brief delay
    setTimeout(startAnimation, 500);
  });

  // For page refreshes when already on desktop
  if (sessionStorage.getItem("logged_in") === "true") {
    // Begin the initial animation cycle after short delay
    // This allows initial page render to complete first
    setTimeout(startAnimation, 500);
  }
}

// ==================================================
// END CRT Effect Utilities
// ==================================================
