// src/scripts/utils/device.js
// Utility for device detection
export function isMobileDevice() {
  return /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
} 