// ==================================================
//  about.js — About App Interactivity for Windows XP Simulation
// ==================================================
/**
 * Handles expand/collapse logic for left panel cards in the About Me app.
 * Loaded as an iframe in the main shell.
 * @file about.js
 */

import { aboutParagraphs, skills, software } from '../../data/about.js';
import { socialLinks, socialLinksAbout } from '../../data/misc.js';

/**
 * Initialize listeners for card collapse/expand on DOMContentLoaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Render About Me paragraphs
    const aboutBody = document.querySelector('.about-body');
    if (aboutBody && Array.isArray(aboutParagraphs)) {
        aboutBody.innerHTML = aboutParagraphs.map(p => `
            <div class="about-paragraph-row">
                <span class="about-paragraph-icon-col"><img src="${p.icon}" alt="Paragraph icon" class="about-paragraph-icon"></span>
                <span class="about-paragraph-text">${p.text}</span>
            </div>
        `).join('');
    }

    // Render Social Links from misc.js
    const socialLinksContainer = document.querySelector('.social-links-container');
    if (socialLinksContainer && Array.isArray(socialLinksAbout)) {
        socialLinksContainer.innerHTML = socialLinksAbout.map(s =>
            `<a href="${socialLinks[s.key]}" target="_blank" rel="noopener" class="social-link-row" data-key="${s.key}">
                <img src="${s.icon}" alt="${s.label}" class="social-link-icon" />
                <span class="social-link-label">${s.label}</span>
            </a>`
        ).join('');
    }

    // Render Skills
    const skillsContainer = document.querySelector('.skills-container');
    if (skillsContainer && Array.isArray(skills)) {
        skillsContainer.innerHTML = skills.map(skill => `
            <div class="left-panel__card__row">
                <img class="left-panel__card__img" src="${skill.icon}" alt="${skill.label}" />
                <span class="left-panel__card__text">${skill.label}</span>
            </div>
        `).join('');
    }

    // Render Software
    const softwareContainer = document.querySelector('.software-container');
    if (softwareContainer && Array.isArray(software)) {
        softwareContainer.innerHTML = software.map(soft => `
            <div class="left-panel__card__row">
                <img class="left-panel__card__img" src="${soft.icon}" alt="${soft.label}" />
                <span class="left-panel__card__text">${soft.label}</span>
            </div>
        `).join('');
    }

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

    // Intercept Instagram link click in left panel
    const igLink = document.querySelector('.social-link-row[data-key="instagram"]');
    if (igLink) {
        igLink.addEventListener('click', function(e) {
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