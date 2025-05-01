// src/scripts/utils/device.js
// Utility for device detection
export function isMobileDevice() {
  return /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
}

// On mobile Safari, trigger a 1px scroll to try to hide the address bar
export function triggerSafariAddressBarHideTrick() {
  if (!isMobileDevice()) return;
  let triggered = false;
  function doScrollTrick() {
    if (triggered) return;
    triggered = true;
    window.scrollTo(0, 1);
    window.removeEventListener('touchstart', doScrollTrick, { passive: true });
  }
  window.addEventListener('touchstart', doScrollTrick, { passive: true });
} 