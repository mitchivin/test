// Function to handle opening external links safely
function openExternalLink(url) {
    if (window.parent && window.parent !== window) {
        try {
            // Ask the parent window shell to open the link
            window.parent.postMessage({ type: 'openExternal', url: url }, '*');
        } catch (error) {
            console.error("Could not postMessage to parent: ", error);
            window.open(url, '_blank', 'noopener,noreferrer'); // Fallback
        }
    } else {
        window.open(url, '_blank', 'noopener,noreferrer'); // Fallback if no parent
    }
}

// Setup for social links in the left panel
function setupSocialLinks() {
    // Attach click handler to each social link row
    document.querySelectorAll('a.left-panel__card__row.social-link').forEach(row => {
        row.addEventListener('click', (e) => {
            e.preventDefault();
            openExternalLink(row.href);
        });
    });
}

// Initialize listeners when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupSocialLinks();

    // Add functionality to toggle card visibility
    document.querySelectorAll('.left-panel__card__header__img').forEach(icon => {
        icon.addEventListener('click', function (e) {
            e.stopPropagation(); // Prevent bubbling if needed
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
}); 