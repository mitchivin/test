/**
 * device.js — Device Detection Utility for Windows XP Simulation
 *
 * Provides:
 * - Utility function to detect mobile devices (user agent or viewport width)
 *
 * Usage:
 *   import { isMobileDevice } from './device.js';
 *   if (isMobileDevice()) { ... }
 *
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
