/**
 * crtEffect.js — CRT Visual Effect Utilities for Windows XP Simulation
 *
 * Handles:
 * - CSS injection and scanline/flicker animation logic
 * - Randomized scanline movement for CRT simulation
 *
 * Usage:
 *   import { initRandomScanline } from './crtEffect.js';
 *   initRandomScanline();
 *
 * @module crtEffect
 */

// ==================================================
//  CRT Effect Utilities for Windows XP Simulation
// ==================================================

// CRT Effect: Combined CSS and JS

// Animation timing constants for CRT scanline effect
const SCANLINE_MIN_DELAY_MS = 1000;
const SCANLINE_MAX_DELAY_MS = 3000;
const SCANLINE_MIN_DURATION_MS = 4000;
const SCANLINE_MAX_DURATION_MS = 3000;

// ===== CRT Scanline Effect =====
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
  if (!scanline) return;
  let isAnimationStarted = false;
  scanline.addEventListener("transitionend", () => {
    scanline.style.transition = "none";
    scanline.style.transform = "translateY(-10px)";
    const nextInterval =
      SCANLINE_MIN_DELAY_MS + Math.random() * SCANLINE_MAX_DELAY_MS;
    setTimeout(startAnimation, nextInterval);
  });
  function startAnimation() {
    void scanline.offsetWidth;
    const duration =
      SCANLINE_MIN_DURATION_MS + Math.random() * SCANLINE_MAX_DURATION_MS;
    scanline.style.transition = `transform ${duration}ms linear`;
    scanline.style.transform = "translateY(100vh)";
    isAnimationStarted = true;
  }
  document.querySelector(".desktop").addEventListener(
    "click",
    () => {
      if (!isAnimationStarted) {
        startAnimation();
      }
    },
    { once: true },
  );
  document.addEventListener("reinitScanline", () => {
    setTimeout(startAnimation, 500);
  });
  if (sessionStorage.getItem("logged_in") === "true") {
    setTimeout(startAnimation, 500);
  }
}

// ==================================================
// END CRT Effect Utilities
// ==================================================
