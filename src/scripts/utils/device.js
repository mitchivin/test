/**
 * device.js — Device Detection Utility for Windows XP Simulation
 * Utility function to detect mobile devices (user agent or viewport width).
 * @module device
 */

// ===== Device Detection Utility =====
/**
 * Detects if the current device is a mobile device based on user agent or viewport width.
 * @returns {boolean} True if the device is mobile, false otherwise.
 */
export function isMobileDevice() {
  return /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
}
