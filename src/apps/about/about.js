// ==================================================
//  about.js — About App Interactivity for Windows XP Simulation
// ==================================================
/**
 * Handles expand/collapse logic for left panel cards in the About Me app.
 * Loaded as an iframe in the main shell.
 * @file about.js
 */

/**
 * Initialize listeners for card collapse/expand on DOMContentLoaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.left-panel__card__header__img').forEach(icon => {
        icon.addEventListener('click', function (e) {
            e.stopPropagation(); // Prevent bubbling
            const card = this.closest('.left-panel__card');
            card.classList.toggle('collapsed');

            // Update icon source based on collapsed state and card type
            const isCollapsed = card.classList.contains('collapsed');
            if (card.classList.contains('left-panel__card--social')) {
                this.src = isCollapsed
                    ? '../../../assets/apps/about/pulldown-alt.webp'
                    : '../../../assets/apps/about/pullup-alt.webp';
            } else {
                this.src = isCollapsed
                    ? '../../../assets/apps/about/pulldown.webp'
                    : '../../../assets/apps/about/pullup.webp';
            }
        });
    });

    // Intercept Instagram link click
    const instagramLink = document.querySelector('.social-link a[href*="instagram.com"]');
    if (instagramLink) {
        instagramLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'open-instagram-from-about' }, '*');
            }
        });
    }
});

document.addEventListener('click', (event) => {
  // Optionally: filter out clicks inside your own popouts/menus if needed
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'iframe-interaction' }, '*');
  }
}); 