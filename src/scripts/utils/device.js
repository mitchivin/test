/*
 * device.js — Device detection utility for Windows XP simulation.
 * Provides a function to determine if the current device is considered mobile, based on user agent and viewport width.
 * @file src/scripts/utils/device.js
 */

// ===== Device Detection Utility =====
/**
 * Detects if the current device is a mobile device.
 * Considers a device mobile if the navigator's user agent string matches common mobile keywords (Mobi or Android)
 * OR if the window's inner width is less than or equal to 768 pixels.
 * @returns {boolean} True if the device is determined to be mobile, false otherwise.
 */
export function isMobileDevice() {
  // Check if the user agent string contains mobile-specific keywords.
  const isUserAgentMobile = /Mobi|Android/i.test(navigator.userAgent);
  // Check if the viewport width is indicative of a mobile device.
  const isViewportMobile = window.innerWidth <= 768;
  return isUserAgentMobile || isViewportMobile;
}
