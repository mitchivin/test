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

// Setup skill -> software highlighting using ref/script.js logic and ref CSS class
function setupSkillSoftwareHighlight() {
    const skillItems = document.querySelectorAll('.skills-grid > div[data-software]');
    const softwareItems = document.querySelectorAll('.software-grid > li[data-software]');

    skillItems.forEach(skill => {
        skill.addEventListener('mouseenter', () => {
            const relatedSoftware = skill.dataset.software?.split(',') || [];
            softwareItems.forEach(sw => {
                sw.classList.remove('force-hover');
                if (relatedSoftware.includes('all') || relatedSoftware.includes(sw.dataset.software)) {
                    sw.classList.add('force-hover');
                }
            });
        });

        skill.addEventListener('mouseleave', () => {
            softwareItems.forEach(sw => sw.classList.remove('force-hover'));
        });
    });
}

// Listener for potential messages from parent (like close)
window.addEventListener('message', (event) => {
    // Optional: Add origin check for security
    // if (event.origin !== 'http://expected-origin.com') return;

    // Handle maximize/unmaximize messages
    if (event.data?.type === 'window:maximized') {
        document.body.classList.add('is-maximized');
    }
    if (event.data?.type === 'window:unmaximized') {
        document.body.classList.remove('is-maximized');
    }

    // Handle triggerAction messages (like close)
    if (event.data && event.data.type === 'triggerAction') {
        switch (event.data.action) {
            case 'file:exit':
            case 'window:close':
                if (window.parent && window.parent !== window) {
                     window.parent.postMessage({ type: 'closeWindow', windowId: event.data.windowId }, '*');
                }
                break;
        }
    }
});

// Initialize listeners when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupSocialLinks();
    setupSkillSoftwareHighlight();

    // Skills/Software shared toggle (clean version)
    const skillsToggleBtn = document.querySelector('.skills-toggle-btn');
    const softwareToggleBtn = document.querySelector('.software-toggle-btn');
    const contentContainer = document.querySelector('.skills-software-content');
    const skillsCardHTML = `<div class="skills-software-card fade-in">
      <div class="card-title">Skills</div>
      <ul class="card-list">
        <li><span class="card-icon">✔️</span>Social Graphics</li>
        <li><span class="card-icon">✔️</span>Web Design</li>
        <li><span class="card-icon">✔️</span>Video Production</li>
        <li><span class="card-icon">✔️</span>Print Design</li>
        <li><span class="card-icon">✔️</span>Motion Graphics</li>
      </ul>
    </div>`;
    const softwareCardHTML = `<div class="skills-software-card fade-in">
      <div class="card-title">Software</div>
      <ul class="card-list">
        <li><span class="card-icon">✔️</span>Photoshop</li>
        <li><span class="card-icon">✔️</span>Illustrator</li>
        <li><span class="card-icon">✔️</span>Premiere Pro</li>
        <li><span class="card-icon">✔️</span>After Effects</li>
        <li><span class="card-icon">✔️</span>InDesign</li>
        <li><span class="card-icon">✔️</span>Lightroom</li>
        <li><span class="card-icon">✔️</span>Blender</li>
        <li><span class="card-icon">✔️</span>VSCode</li>
        <li><span class="card-icon">✔️</span>Wordpress</li>
      </ul>
    </div>`;
    let current = null;
    skillsToggleBtn && skillsToggleBtn.addEventListener('click', function() {
        if (current === 'skills') {
            contentContainer.innerHTML = '';
            current = null;
            skillsToggleBtn.querySelector('.btn-text').textContent = 'Show skills';
        } else {
            contentContainer.innerHTML = skillsCardHTML;
            current = 'skills';
            skillsToggleBtn.querySelector('.btn-text').textContent = 'Hide skills';
            softwareToggleBtn.querySelector('.btn-text').textContent = 'Show software';
        }
    });
    softwareToggleBtn && softwareToggleBtn.addEventListener('click', function() {
        if (current === 'software') {
            contentContainer.innerHTML = '';
            current = null;
            softwareToggleBtn.querySelector('.btn-text').textContent = 'Show software';
        } else {
            contentContainer.innerHTML = softwareCardHTML;
            current = 'software';
            softwareToggleBtn.querySelector('.btn-text').textContent = 'Hide software';
            skillsToggleBtn.querySelector('.btn-text').textContent = 'Show skills';
        }
    });
}); 