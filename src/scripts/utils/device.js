// src/scripts/utils/device.js
// Utility for device detection
/**
 * Detects if the current device is a mobile device based on user agent or viewport width.
 * @returns {boolean} True if the device is mobile, false otherwise.
 */
export function isMobileDevice() {
  return /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
}
