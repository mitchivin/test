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
    // Default About Me paragraphs and icons
    const DEFAULT_PARAGRAPHS = [
        "I'm Mitch, a graphic designer based in Brisbane, Australia, driven by a genuine love for creating. Building ideas from the ground up and bringing them to life through design is what motivates me. Every project is an opportunity to sharpen my skills, solve meaningful problems, and create visuals with impact.",
        "Growing up in New Zealand, rugby shaped my confidence, creativity, and early appreciation for the power of design. Seeing how the All Blacks' visual identity inspired pride and unity showed me the lasting influence strong branding can have. This insight continues to guide my approach today.",
        "After reconnecting with design in my twenties, I completed a Diploma of Graphic Design at QLD TAFE. This gave me a solid foundation in design principles and proficiency with industry-standard tools like Adobe Creative Suite, enabling me to translate ideas into clear, purposeful visuals.",
        "With the design industry rapidly evolving, I am actively embracing AI as a valuable part of my creative workflow. I see it as a way to enhance creativity rather than replace fundamental design thinking, using new technology to push creative boundaries while maintaining quality and purpose.",
        "Looking ahead, my goal is to work with a major sports franchise, helping shape brands that resonate deeply and withstand the test of time. This ambition sets the standard for every project I undertake."
    ];
    const DEFAULT_PARAGRAPH_ICONS = [
        '../../../assets/apps/about/p1.webp',
        '../../../assets/apps/about/p2.webp',
        '../../../assets/apps/about/p3.webp',
        '../../../assets/apps/about/p4.webp',
        '../../../assets/apps/about/p5.webp',
    ];
    const LOCAL_KEY_ABOUT_PARAGRAPHS = 'custom_about_paragraphs';
    const stored = localStorage.getItem(LOCAL_KEY_ABOUT_PARAGRAPHS);
    let paragraphs = [];
    if (stored) {
        try { paragraphs = JSON.parse(stored); } catch {}
    }
    // Backward compatibility: if array of strings, convert to objects
    if (Array.isArray(paragraphs) && typeof paragraphs[0] === 'string') {
        paragraphs = paragraphs.map((text, i) => ({ text, icon: '' }));
    }
    if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
        paragraphs = DEFAULT_PARAGRAPHS.map((text, i) => ({ text, icon: '' }));
    }
    const container = document.querySelector('.about-paragraphs');
    if (container) {
        container.innerHTML = '';
        paragraphs.forEach((para, idx) => {
            const row = document.createElement('div');
            row.className = 'about-paragraph-row';
            // Icon
            const iconCol = document.createElement('span');
            iconCol.className = 'about-paragraph-icon-col';
            const iconImg = document.createElement('img');
            iconImg.className = 'about-paragraph-icon';
            iconImg.src = para.icon || DEFAULT_PARAGRAPH_ICONS[idx] || DEFAULT_PARAGRAPH_ICONS[0];
            iconImg.alt = `Paragraph icon ${idx + 1}`;
            iconCol.appendChild(iconImg);
            // Text
            const textCol = document.createElement('span');
            textCol.className = 'about-paragraph-text';
            textCol.textContent = para.text;
            row.appendChild(iconCol);
            row.appendChild(textCol);
            container.appendChild(row);
        });
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

    // --- Dynamic Skills and Software Cards ---
    const DEFAULT_SKILLS = [
        { text: 'Social Graphics', icon: '../../../assets/apps/about/skill1.webp' },
        { text: 'Web Design', icon: '../../../assets/apps/about/skill2.webp' },
        { text: 'Video Production', icon: '../../../assets/apps/about/skill3.webp' },
        { text: 'Print Design', icon: '../../../assets/apps/about/skill4.webp' },
        { text: 'Motion Graphics', icon: '../../../assets/apps/about/skill5.webp' },
    ];
    const DEFAULT_SOFTWARE = [
        { text: 'Adobe Creative Cloud', icon: '../../../assets/apps/about/software1.webp' },
        { text: 'Figma', icon: '../../../assets/gui/start-menu/vanity-apps/figma.webp' },
        { text: 'Blender', icon: '../../../assets/gui/start-menu/vanity-apps/blender.webp' },
        { text: 'Cursor Code', icon: '../../../assets/gui/start-menu/vanity-apps/cursor.webp' },
    ];
    function renderCardItemsByHeader(headerText, localKey, defaultArr) {
        const cards = document.querySelectorAll('.left-panel__card');
        for (const card of cards) {
            const header = card.querySelector('.left-panel__card__header__text');
            if (header && header.textContent.trim() === headerText) {
                const container = card.querySelector('.left-panel__card__content-inner');
                if (!container) return;
                let items = [];
                const stored = localStorage.getItem(localKey);
                if (stored) {
                    try { items = JSON.parse(stored); } catch {}
                }
                if (!Array.isArray(items) || items.length === 0) items = defaultArr;
                container.innerHTML = '';
                items.forEach(item => {
                    const row = document.createElement('div');
                    row.className = 'left-panel__card__row';
                    const img = document.createElement('img');
                    img.className = 'left-panel__card__img';
                    img.src = item.icon || defaultArr[0].icon;
                    img.alt = item.text;
                    const span = document.createElement('span');
                    span.className = 'left-panel__card__text';
                    span.textContent = item.text;
                    row.appendChild(img);
                    row.appendChild(span);
                    container.appendChild(row);
                });
            }
        }
    }
    // Skills
    renderCardItemsByHeader('Skills', 'custom_about_skills', DEFAULT_SKILLS);
    // Software
    renderCardItemsByHeader('Software', 'custom_about_software', DEFAULT_SOFTWARE);
});

document.addEventListener('click', (event) => {
  // Optionally: filter out clicks inside your own popouts/menus if needed
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'iframe-interaction' }, '*');
  }
}); 