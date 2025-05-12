// ==================================================
//  projects.js — Projects App Interactivity for Windows XP Simulation
// ==================================================
/**
 * Handles lightbox, masonry layout, and interactivity for the My Projects app.
 * Loaded as an iframe in the main shell.
 * @file projects.js
 */

// ===== Global State & Utility Functions =====
// JavaScript for Projects App Lightbox

// Global state for persistent description visibility
let userPrefersDescriptionVisible = false;

// --- Global mute preference for lightbox videos ---
let userPrefersMuted = true; // Default: videos start muted
if (window.sessionStorage && sessionStorage.getItem('projectsUserPrefersMuted') !== null) {
    userPrefersMuted = sessionStorage.getItem('projectsUserPrefersMuted') === 'true';
}

// === Constants ===
const MIN_SWIPE_DISTANCE = 44; // Minimum px for swipe to trigger navigation

// Utility function to check if the current view is desktop-like
function isDesktop() {
    return window.matchMedia('(min-width: 768px)').matches;
}

// Utility function to check if the device is a touchscreen
function isTouchDevice() {
    return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
    );
}

// Utility functions
function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}
function clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
}

function sendMessageToParent(payload) {
    if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, '*');
    }
}

// ===== Description Card Creation =====

/**
 * Creates the desktop description card for the lightbox.
 * @param {string} titleText - The project title
 * @param {string} subheadingText - The subheading (e.g., type)
 * @param {string} descriptionText - The project description
 * @returns {HTMLElement} The animated wrapper containing the card
 */
function createDesktopDescriptionCard(titleText, subheadingText, descriptionText) {
    const animWrapper = createEl('div', 'desc-card-anim-wrapper');
    const descCard = createEl('div', 'lightbox-desc-card');
    clearChildren(descCard);
    descCard.appendChild(createLightboxCloseButton());
    if (titleText) {
        const titleEl = createEl('div', 'card-title', titleText);
        descCard.appendChild(titleEl);
    }
    if (subheadingText) {
        const subheadingEl = createEl('div', 'card-subheading', subheadingText);
        descCard.appendChild(subheadingEl);
    }
    if (descriptionText) {
        const bodyEl = createEl('div', 'card-body', descriptionText);
        descCard.appendChild(bodyEl);
    }
    animWrapper.appendChild(descCard);
    return animWrapper;
}

// Add this function to create the lightbox close button
function createLightboxCloseButton() {
    const btn = document.createElement('div');
    btn.className = 'lightbox-close-btn';
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('aria-label', 'Close');

    const svgNS = 'http://www.w3.org/2000/svg';
    const closeSvg = document.createElementNS(svgNS, 'svg');
    closeSvg.setAttribute('width', '12');
    closeSvg.setAttribute('height', '12');
    closeSvg.setAttribute('viewBox', '0 0 18 18');
    closeSvg.setAttribute('aria-hidden', 'true');
    closeSvg.style.display = 'block';
    closeSvg.innerHTML = `<line x1="4" y1="4" x2="14" y2="14" stroke="#222" stroke-width="2.2" stroke-linecap="round"/><line x1="14" y1="4" x2="4" y2="14" stroke="#222" stroke-width="2.2" stroke-linecap="round"/>`;
    btn.appendChild(closeSvg);

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeLightbox();
    });
    btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            closeLightbox();
        }
    });
    return btn;
}

function createSpinnerOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'video-spinner-overlay';
    overlay.innerHTML = '<div class="video-spinner"></div>';
    return overlay;
}

function createMuteIconOverlay(isMuted) {
    const overlay = document.createElement('div');
    overlay.className = 'mute-icon-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `<img src="../../../assets/apps/projects/${isMuted ? 'voldown' : 'volup'}.webp" alt="${isMuted ? 'Muted' : 'Unmuted'}" draggable="false" style="width:100%;height:100%;object-fit:contain;" />`;
    return overlay;
}

function showMuteIconOverlay(videoElement, isMuted) {
    // Remove any existing overlay
    const existing = videoElement.parentElement.querySelector('.mute-icon-overlay');
    if (existing) existing.remove();
    const overlay = createMuteIconOverlay(isMuted);
    videoElement.parentElement.appendChild(overlay);
    // Only fade in if video is ready (poster is gone)
    if (videoElement.readyState >= 3 && !videoElement.paused) {
        // Force reflow for animation
        void overlay.offsetWidth;
        overlay.classList.add('show');
        setTimeout(() => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 1800);
        }, 1800);
    } else {
        // Wait for 'playing' event before showing overlay
        const onPlay = () => {
            // Only show if overlay is still in DOM
            if (overlay.parentNode) {
                void overlay.offsetWidth;
                overlay.classList.add('show');
                setTimeout(() => {
                    overlay.classList.remove('show');
                    setTimeout(() => overlay.remove(), 1800);
                }, 1800);
            }
            videoElement.removeEventListener('playing', onPlay);
        };
        videoElement.addEventListener('playing', onPlay);
    }
}

function createLightboxMediaElement(type, src, posterUrl = null) {
    if (type === 'image') {
        const imgElement = createEl('img');
        imgElement.alt = 'Project Lightbox Image';
        imgElement.src = src;
        return imgElement;
    } else if (type === 'video') {
        const videoElement = createEl('video');
        videoElement.alt = 'Project Lightbox Video';
        videoElement.controls = false;
        videoElement.autoplay = true;
        videoElement.loop = true;
        videoElement.setAttribute('playsinline', '');
        videoElement.muted = userPrefersMuted;
        if (userPrefersMuted) {
            videoElement.setAttribute('muted', '');
        } else {
            videoElement.removeAttribute('muted');
        }
        videoElement.src = src;
        if (posterUrl) videoElement.poster = posterUrl;
        
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative'; // Keep for overlay positioning
        wrapper.style.display = 'inline-block'; // Changed from 'block' to allow shrink-to-fit
        wrapper.style.flexGrow = '0';    
        wrapper.style.flexShrink = '0';  
        wrapper.style.maxHeight = '100%'; 
        wrapper.style.maxWidth = '100%'; // Added to ensure it respects parent bounds
        wrapper.style.verticalAlign = 'middle'; // Added for better inline-block alignment
        
        wrapper.appendChild(videoElement);
        
        const spinner = createSpinnerOverlay();
        wrapper.appendChild(spinner);
        let hasPlayed = false;
        function hideSpinner() {
            if (spinner.parentNode) spinner.parentNode.removeChild(spinner);
        }
        function showMuteIfPlayed() {
            if (hasPlayed) showMuteIconOverlay(videoElement, videoElement.muted);
        }
        // Remove spinner only when video is actually playing
        videoElement.addEventListener('playing', () => {
            hasPlayed = true;
            hideSpinner();
            showMuteIconOverlay(videoElement, videoElement.muted);
        });
        // Fallback: hide spinner after 8s if video never plays
        setTimeout(() => { if (!hasPlayed) hideSpinner(); }, 8000);
        videoElement.addEventListener('click', (e) => {
            e.stopPropagation();
            videoElement.muted = !videoElement.muted;
            if (videoElement.muted) {
                videoElement.setAttribute('muted', '');
            } else {
                videoElement.removeAttribute('muted');
            }
            // Update global preference and persist
            userPrefersMuted = videoElement.muted;
            if (window.sessionStorage) {
                sessionStorage.setItem('projectsUserPrefersMuted', userPrefersMuted);
            }
            showMuteIfPlayed();
        });
        // --- Desktop hover: show mute/unmute overlay on hover ---
        if (!isTouchDevice()) {
            let fadeOutTimeout = null;
            wrapper.addEventListener('mouseenter', () => {
                if (fadeOutTimeout) {
                    clearTimeout(fadeOutTimeout);
                    fadeOutTimeout = null;
                }
                showMuteIconOverlay(videoElement, videoElement.muted);
            });
            wrapper.addEventListener('mouseleave', () => {
                if (fadeOutTimeout) clearTimeout(fadeOutTimeout);
                fadeOutTimeout = setTimeout(() => {
                    // Remove overlay after 2s delay, then fade out
                    const overlay = wrapper.querySelector('.mute-icon-overlay');
                    if (overlay) {
                        overlay.classList.remove('show');
                        setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 200);
                    }
                }, 2000); // 2 seconds delay before fade out
            });
            // Also update overlay if mute state changes while hovered
            videoElement.addEventListener('volumechange', () => {
                if (wrapper.matches(':hover')) {
                    showMuteIconOverlay(videoElement, videoElement.muted);
                }
            });
        }
        return wrapper;
    }
    return null;
}

document.addEventListener('DOMContentLoaded', () => {
    const lightbox = document.getElementById('project-lightbox');
    const lightboxContent = document.getElementById('lightbox-content');
    const lightboxDetails = document.getElementById('lightbox-details');
    const posts = document.querySelectorAll('.post');
    const feedContainer = document.querySelector('.feed-container');

    userPrefersDescriptionVisible = isDesktop(); // Initialize based on view

    if (!lightbox || !lightboxContent || !lightboxDetails || !feedContainer) {
        return;
    }

    function setHomeButtonEnabledInParent(enabled) {
        sendMessageToParent({ type: 'set-home-enabled', enabled });
    }

    // Centralized function to update lightbox details
    function updateLightboxDetails(title, subheading, description) {
        clearChildren(lightboxDetails);
        if (title) {
            lightboxDetails.appendChild(createEl('div', null, title)).id = 'lightbox-title';
        }
        if (subheading) {
            const subEl = createEl('div', null, subheading);
            subEl.id = 'lightbox-subheading';
            lightboxDetails.appendChild(subEl);
        }
        // Only add description to lightboxDetails if not on desktop (desktop uses animated card)
        if (description && !isDesktop()) {
            const descEl = createEl('div', null, description);
            descEl.id = 'lightbox-description';
            lightboxDetails.appendChild(descEl);
        }
    }

    function openLightbox() {
        document.querySelectorAll('.feed-container video').forEach(v => { v.pause(); });

        // Core content setup is now handled by openLightboxByIndex
        if (currentLightboxIndex === null) {
            // This should ideally be set by the click handler before openLightbox is called.
            // As a fallback, try to find it if only one post exists for some reason (unlikely).
            if (allPosts.length === 1) currentLightboxIndex = 0;
            else {
                return; // Cannot proceed without a current index
            }
        }
        openLightboxByIndex(currentLightboxIndex, 0); // Direction 0 for initial open

        // General lightbox display logic (already present, keep)
        lightbox.style.display = 'flex';
        lightbox.classList.remove('fade-out');
        void lightbox.offsetWidth; // reflow
        requestAnimationFrame(() => {
            lightbox.classList.add('fade-in');
        });
        document.body.style.overflow = 'hidden';
        lightbox.style.visibility = '';
        setHomeButtonEnabledInParent(true);
    }

    function closeLightbox() {
        lightbox.classList.remove('fade-in');
        lightbox.classList.add('fade-out');
        let transitionEnded = false;
        const onTransitionEnd = (e) => {
            if (e.target === lightbox && e.propertyName === 'opacity') {
                transitionEnded = true;
                lightbox.style.display = 'none';
                lightbox.classList.remove('fade-out');
                lightbox.removeEventListener('transitionend', onTransitionEnd);
                lightbox.style.visibility = 'hidden';
                lightbox.style.opacity = '';
                if (lightboxContent) lightboxContent.style.opacity = '';
            }
        };
        lightbox.addEventListener('transitionend', onTransitionEnd);
        setTimeout(() => {
            if (!transitionEnded && lightbox.classList.contains('fade-out')) {
                lightbox.style.display = 'none';
                lightbox.classList.remove('fade-out');
                lightbox.removeEventListener('transitionend', onTransitionEnd);
                lightbox.style.visibility = 'hidden';
                lightbox.style.opacity = '';
                if (lightboxContent) lightboxContent.style.opacity = '';
            }
        }, 300);
        const mediaElement = lightboxContent.querySelector('video, img');
        if (mediaElement && mediaElement.tagName === 'VIDEO') {
            mediaElement.pause();
            mediaElement.removeAttribute('src');
            mediaElement.load();
        }
        clearChildren(lightboxContent);
        clearChildren(lightboxDetails);
        document.body.style.overflow = '';
        setHomeButtonEnabledInParent(false);

        // Also explicitly remove any overlays that might be direct children of lightboxContent or lightbox
        // This is a safety measure, though they should be inside the wrapper cleared by clearChildren(lightboxContent)
        lightbox.querySelectorAll('.lightbox-title-overlay, .lightbox-description-overlay').forEach(o => o.remove());

        // Notify parent that lightbox is closed (disable back/forward/desc)
        sendMessageToParent({ type: 'lightbox-state', open: false });

        // Restore grid video playback logic after closing lightbox
        if (typeof isMaximized !== 'undefined' && isMaximized) {
          gridVideos.forEach(video => video.play());
        } else if (typeof setupIntersectionObserver === 'function') {
          setupIntersectionObserver();
        }
    }

    // --- Lightbox Description Overlay ---
    function createLightboxOverlay(text, position = 'bottom', linkType, linkUrl) {
        const overlay = document.createElement('div');
        overlay.className = position === 'top' ? 'lightbox-title-overlay' : 'lightbox-description-overlay';
        if (position === 'top') {
            overlay.style.pointerEvents = 'auto'; // Allow interaction for links in the top overlay
        } else {
            overlay.style.pointerEvents = 'none'; // Non-blocking for description overlay
        }

        if (position === 'top') {
            const titleSpan = createEl('span', 'lightbox-overlay-title-text', text || '');
            overlay.appendChild(titleSpan);
        } else { // For bottom overlay, show subheading and icon (if present)
            // Create a flex row: subheading left, icon right (if present)
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.width = '100%';

            const subheadingSpan = document.createElement('span');
            subheadingSpan.textContent = text || '';
            subheadingSpan.style.flexGrow = '1';
            row.appendChild(subheadingSpan);

            if (linkType && linkUrl) {
                const iconLink = createEl('a', 'mobile-title-link-icon');
                iconLink.href = linkUrl;
                iconLink.target = '_blank'; // Open in new tab
                iconLink.setAttribute('aria-label', `View on ${linkType}`);

                const iconImg = createEl('img');
                const lowerLinkType = linkType.toLowerCase();
                iconImg.src = `../../../assets/gui/start-menu/${lowerLinkType}.webp`;
                iconImg.alt = `Open project on ${linkType}`;
                iconLink.appendChild(iconImg);

                // Prevent tap/click on the icon link from toggling/hiding the overlay
                iconLink.addEventListener('touchend', function(e) {
                    e.stopPropagation();
                });
                iconLink.addEventListener('click', function(e) {
                    e.stopPropagation();
                });

                row.appendChild(iconLink);
            }
            overlay.appendChild(row);
        }
        return overlay;
    }

    // NEW function to handle toggling of BOTH mobile overlays (top title, bottom description)
    function toggleMobileOverlays(titleText, descriptionText, wrapper, linkType, linkUrl) {
        if (!wrapper || isDesktop()) return;

        // --- Handle Top Title Overlay ---
        let titleOverlay = wrapper.querySelector('.lightbox-title-overlay');
        if (!titleOverlay) { // If it doesn't exist, create and show it
            titleOverlay = createLightboxOverlay(titleText, 'top', linkType, linkUrl);
            wrapper.appendChild(titleOverlay);
            void titleOverlay.offsetWidth; // Reflow
            titleOverlay.classList.remove('hide-anim'); // Ensure no hide animation is running
            titleOverlay.classList.add('show');
            titleOverlay.style.pointerEvents = 'auto';
        } else { // If it exists, toggle its visibility
            if (titleOverlay.classList.contains('show')) {
                titleOverlay.style.animation = ''; // Clear inline animation before applying new class animation
                titleOverlay.style.transition = '';
                titleOverlay.classList.remove('show');
                titleOverlay.classList.add('hide-anim');
                titleOverlay.style.pointerEvents = 'none';
                titleOverlay.addEventListener('animationend', function onHide() {
                    this.removeEventListener('animationend', onHide);
                    if (this.parentNode) this.parentNode.removeChild(this);
                }, { once: true });
            } else {
                titleOverlay.remove(); // Clean up any remnants
                titleOverlay = createLightboxOverlay(titleText, 'top', linkType, linkUrl);
                wrapper.appendChild(titleOverlay);
                void titleOverlay.offsetWidth; 
                titleOverlay.classList.remove('hide-anim');
                titleOverlay.classList.add('show');
                titleOverlay.style.pointerEvents = 'auto';
            }
        }

        // --- Handle Bottom Description Overlay (similar logic) ---
        let descOverlay = wrapper.querySelector('.lightbox-description-overlay');
        if (!descOverlay) { // If it doesn't exist, create and show it
            descOverlay = createLightboxOverlay(descriptionText, 'bottom', linkType, linkUrl);
            wrapper.appendChild(descOverlay);
            void descOverlay.offsetWidth; // Reflow
            descOverlay.classList.remove('hide-anim'); // Ensure no hide animation is running
            descOverlay.classList.add('show');
            descOverlay.style.pointerEvents = 'auto';
        } else { // If it exists, toggle its visibility
            if (descOverlay.classList.contains('show')) {
                descOverlay.style.animation = ''; // Clear inline animation before applying new class animation
                descOverlay.style.transition = '';
                descOverlay.classList.remove('show');
                descOverlay.classList.add('hide-anim');
                descOverlay.style.pointerEvents = 'none';
                descOverlay.addEventListener('animationend', function onHide() {
                    this.removeEventListener('animationend', onHide);
                    if (this.parentNode) this.parentNode.removeChild(this);
                }, { once: true });
            } else {
                descOverlay.remove();
                descOverlay = createLightboxOverlay(descriptionText, 'bottom', linkType, linkUrl);
                wrapper.appendChild(descOverlay);
                void descOverlay.offsetWidth;
                descOverlay.classList.remove('hide-anim');
                descOverlay.classList.add('show');
                descOverlay.style.pointerEvents = 'auto';
            }
        }

        // After handling both overlays, update the persistent state based on their visibility
        userPrefersDescriptionVisible = (titleOverlay && titleOverlay.classList.contains('show')) || 
                                (descOverlay && descOverlay.classList.contains('show'));
        sendMessageToParent({ type: 'description-state', open: userPrefersDescriptionVisible });
        // Throttle the toolbar button in the parent shell (for visual feedback)
        sendMessageToParent({ type: 'throttle-toolbar', key: 'view-description' });
    }

    function toggleLightboxOverlay(description, wrapper) { // This now PRIMARILY handles the DESKTOP card
        if (!wrapper) return;
        if (isDesktop()) {
            // For desktop, visibility is controlled by .desc-visible on the wrapper.
            // The CSS transitions on .desc-card-anim-wrapper (width) and .lightbox-desc-card (opacity/transform)
            // are scoped under .lightbox-media-wrapper.desc-visible.

            const isCurrentlyVisible = wrapper.classList.contains('desc-visible');

            if (isCurrentlyVisible) { // HIDING LOGIC
                wrapper.classList.remove('desc-visible');
                userPrefersDescriptionVisible = false; // Update persistent state
                sendMessageToParent({ type: 'description-state', open: false });
            } else { // SHOWING LOGIC
                let animWrapper = wrapper.querySelector('.desc-card-anim-wrapper');
                let card = animWrapper ? animWrapper.querySelector('.lightbox-desc-card') : null;

                if (!animWrapper) {
                    // Fetch current post data if we need to create everything new
                    const currentPostData = allPosts[currentLightboxIndex] ? allPosts[currentLightboxIndex].dataset : {};
                    const dynamicSubheading = getSubheadingName(currentPostData.title);
                    animWrapper = createDesktopDescriptionCard(currentPostData.title, dynamicSubheading, currentPostData.description);
                    wrapper.appendChild(animWrapper);
                    card = animWrapper.querySelector('.lightbox-desc-card'); 
                } else if (!card && animWrapper) { 
                    while (animWrapper.firstChild) animWrapper.removeChild(animWrapper.firstChild);
                    const currentPostData = allPosts[currentLightboxIndex] ? allPosts[currentLightboxIndex].dataset : {};
                    const dynamicSubheading = getSubheadingName(currentPostData.title);
                    const newCardElement = createDesktopDescriptionCard(currentPostData.title, dynamicSubheading, currentPostData.description).querySelector('.lightbox-desc-card');
                    animWrapper.appendChild(newCardElement);
                    card = newCardElement;
                } 
                
                // Ensure text content is set on the card (now handled by creation, but good for updates if we add that)
                if (card) {
                    // If card exists, but children are missing, or text needs update (e.g. if desc could change dynamically)
                    // This part might need enhancement if card content can change without full recreation
                    const currentPostData = allPosts[currentLightboxIndex] ? allPosts[currentLightboxIndex].dataset : {};
                    const dynamicSubheading = getSubheadingName(currentPostData.title);
                    clearChildren(card); // Clear old single text node if any
                    if (currentPostData.title) card.appendChild(createEl('div', 'card-title', currentPostData.title));
                    if (dynamicSubheading) card.appendChild(createEl('div', 'card-subheading', dynamicSubheading));
                    if (currentPostData.description) card.appendChild(createEl('div', 'card-body', currentPostData.description));
                }
                
                if (animWrapper) {
                    animWrapper.style.width = ''; // Clear any inline width from previous operations
                    void animWrapper.offsetHeight; // Force reflow to establish current state before transition
                }
                
                wrapper.classList.add('desc-visible');
                userPrefersDescriptionVisible = true; // Update persistent state
                sendMessageToParent({ type: 'description-state', open: true });
            }
        }
    }

    let currentLightboxIndex = null;
    let allPosts = Array.from(document.querySelectorAll('.post'));

    // Ensure a persistent wrapper exists
    function getOrCreateWrapper() {
        let wrapper = lightboxContent.querySelector('.lightbox-media-wrapper');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'lightbox-media-wrapper';
            // No inline styles should be applied here; CSS will handle styling.
            lightboxContent.appendChild(wrapper);
        }
        return wrapper;
    }

    // Function to open a specific lightbox item by its index in the allPosts array.
    // Handles animating out the old content and animating in the new content.
    // Direction: 1 for next, -1 for previous, 0 for no specific direction (initial open).
    // skipFadeIn: boolean, for mobile swipe, uses a slide transition instead of fade for new media.
    function openLightboxByIndex(index, direction = 0, skipFadeIn = false) {
        if (index < 0) index = allPosts.length - 1;
        if (index >= allPosts.length) index = 0;
        const post = allPosts[index];
        if (!post) return;
        currentLightboxIndex = index; // Update the global index

        const type = post.dataset.type;
        const src = post.dataset.src;
        const poster = post.dataset.poster || null;
        const title = post.dataset.title;
        const desktopDescription = post.dataset.description;
        const mobileDescription = post.dataset.mobileDescription;
        const linkType = post.dataset.linkType;
        const linkUrl = post.dataset.linkUrl;
        const software = post.dataset.software;

        const dynamicSubheading = getSubheadingName(title);

        // Always use a persistent wrapper for lightbox media and description
        const wrapper = getOrCreateWrapper();

        // --- Animation Coordination for Content Swap ---
        // Flags to track if old media and description card have finished their exit animations.
        const oldMedia = wrapper.querySelector('img, video');
        const oldAnimWrapper = wrapper.querySelector('.desc-card-anim-wrapper');
        const oldDescCard = oldAnimWrapper ? oldAnimWrapper.querySelector('.lightbox-desc-card') : null;
        let mediaFaded = !oldMedia; // True if no old media to animate out
        let descCardFadedOut = !oldDescCard; // True if no old description card to animate out
        let mobileTitleOverlayFadedOut = true; // Assume true if not mobile or no overlay
        let mobileDescOverlayFadedOut = true; // Assume true if not mobile or no overlay

        // --- NEW: Fade out mute icon overlay if present ---
        if (oldMedia && oldMedia.parentElement) {
            const muteOverlay = oldMedia.parentElement.querySelector('.mute-icon-overlay.show');
            if (muteOverlay) {
                muteOverlay.classList.remove('show');
                let removed = false;
                const removeMuteOverlay = () => {
                    if (removed) return;
                    removed = true;
                    muteOverlay.removeEventListener('transitionend', removeMuteOverlay);
                    if (muteOverlay.parentNode) muteOverlay.parentNode.removeChild(muteOverlay);
                };
                muteOverlay.addEventListener('transitionend', removeMuteOverlay);
                setTimeout(removeMuteOverlay, 250); // Fallback in case transitionend doesn't fire
            }
        }

        // --- Mobile Overlays: Trigger hide animation before content swap --- 
        if (isTouchDevice()) {
            const activeTitleOverlay = wrapper.querySelector('.lightbox-title-overlay.show');
            if (activeTitleOverlay) {
                mobileTitleOverlayFadedOut = false; // Mark as needing to fade
                activeTitleOverlay.style.animation = ''; // Clear inline style before adding .hide-anim
                activeTitleOverlay.style.transition = '';
                activeTitleOverlay.classList.remove('show'); 
                activeTitleOverlay.classList.add('hide-anim');
                activeTitleOverlay.style.pointerEvents = 'none';
                let titleOverlayHandled = false;
                const onTitleHide = () => {
                    if (titleOverlayHandled) return;
                    titleOverlayHandled = true;
                    activeTitleOverlay.removeEventListener('animationend', onTitleHide);
                    if (activeTitleOverlay.parentNode) activeTitleOverlay.parentNode.removeChild(activeTitleOverlay);
                    mobileTitleOverlayFadedOut = true;
                    trySwapInNewContent(); 
                };
                activeTitleOverlay.addEventListener('animationend', onTitleHide, { once: true });
                setTimeout(() => { // Fallback
                    if (!titleOverlayHandled) {
                        if (activeTitleOverlay && activeTitleOverlay.parentNode) activeTitleOverlay.remove();
                        mobileTitleOverlayFadedOut = true;
                        trySwapInNewContent();
                    }
                }, 300); // Reduced from 450ms to 300ms to match faster CSS animation
            }

            const activeDescOverlay = wrapper.querySelector('.lightbox-description-overlay.show');
            if (activeDescOverlay) {
                mobileDescOverlayFadedOut = false; // Mark as needing to fade
                activeDescOverlay.style.animation = ''; // Clear inline style before adding .hide-anim
                activeDescOverlay.style.transition = '';
                activeDescOverlay.classList.remove('show');
                activeDescOverlay.classList.add('hide-anim');
                activeDescOverlay.style.pointerEvents = 'none';
                let descOverlayHandled = false;
                const onDescHide = () => {
                    if (descOverlayHandled) return;
                    descOverlayHandled = true;
                    activeDescOverlay.removeEventListener('animationend', onDescHide);
                    if (activeDescOverlay.parentNode) activeDescOverlay.parentNode.removeChild(activeDescOverlay);
                    mobileDescOverlayFadedOut = true;
                    trySwapInNewContent();
                };
                activeDescOverlay.addEventListener('animationend', onDescHide, { once: true });
                setTimeout(() => { // Fallback
                    if (!descOverlayHandled) {
                        if (activeDescOverlay && activeDescOverlay.parentNode) activeDescOverlay.remove();
                        mobileDescOverlayFadedOut = true;
                        trySwapInNewContent();
                    }
                }, 300); // Reduced from 450ms to 300ms to match faster CSS animation
            }
        }

        // This function is called after old media or old description card finishes animating out.
        // It checks if *both* are done before proceeding to swap in the new content.
        function trySwapInNewContent() {
            if (mediaFaded && descCardFadedOut && mobileTitleOverlayFadedOut && mobileDescOverlayFadedOut) { 
                while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

                wrapper.classList.remove('image-media-active', 'video-media-active');
                if (type === 'video') {
                    wrapper.classList.add('video-media-active');
                } else if (type === 'image') {
                    wrapper.classList.add('image-media-active');
                }

                // Pass null for posterUrl as poster logic is removed
                let newMedia = createLightboxMediaElement(type, src, poster);

                if (newMedia) {
                    if (!(skipFadeIn && !isDesktop())) { // Condition for initial mobile open
                        // Cleaned: Only append newMedia. Its visibility relies on parent and CSS.
                        wrapper.appendChild(newMedia);
                    } else { // This is for mobile swipe navigation OR desktop
                        const slideFrom = direction === 1 ? '100vw' : direction === -1 ? '-100vw' : '100vw';
                        newMedia.style.transform = `translateX(${slideFrom})`;
                        newMedia.style.transition = 'transform 400ms cubic-bezier(0.4,0,0.2,1)';
                        newMedia.style.opacity = '1'; 
                        newMedia.style.visibility = 'visible';
                        newMedia.style.display = (newMedia.tagName === 'IMG' || newMedia.tagName === 'VIDEO') ? 'block' : 'flex'; 

                        wrapper.appendChild(newMedia);
                        void newMedia.offsetWidth; 
                        setTimeout(() => { newMedia.style.transform = 'translateX(0)'; }, 10);
                    }
                }

                if (isDesktop()) {
                    if (wrapper.classList.contains('desc-visible')) {
                        wrapper.classList.remove('desc-visible');
                        void wrapper.offsetHeight; // Force reflow
                    }

                    const newAnimWrapper = createDesktopDescriptionCard(title, dynamicSubheading, desktopDescription);
                    wrapper.appendChild(newAnimWrapper);
                    
                    if (userPrefersDescriptionVisible) {
                        void newAnimWrapper.offsetHeight; // Ensure this line is present
                        wrapper.classList.add('desc-visible');
                    } else {
                        wrapper.classList.remove('desc-visible'); // Ensure it's hidden
                    }
                } else { // Mobile logic for applying persistent state
                    // Always remove any existing mobile overlays before deciding to show new ones.
                    // This ensures we're working with a clean slate for the new item's overlays.
                    // --- PATCH: Only re-create overlays if not already visible ---
                    const existingTitleOverlay = wrapper.querySelector('.lightbox-title-overlay.show');
                    const existingDescOverlay = wrapper.querySelector('.lightbox-description-overlay.show');
                    if (userPrefersDescriptionVisible) {
                        if (!existingTitleOverlay || !existingDescOverlay) {
                            // Remove any old overlays (not visible)
                            wrapper.querySelectorAll('.lightbox-title-overlay, .lightbox-description-overlay').forEach(o => o.remove());
                            const createAndShowOverlays = () => {
                                const postData = allPosts[currentLightboxIndex].dataset;
                                const newTitle = postData.title || '';
                                // Use the same subheading logic as desktop
                                const newSubheading = getSubheadingName(newTitle);
                                const newLinkType = postData.linkType;
                                const newLinkUrl = postData.linkUrl;

                                // Create and show title overlay for the new item
                                const titleOverlay = createLightboxOverlay(newTitle, 'top', newLinkType, newLinkUrl);
                                wrapper.appendChild(titleOverlay);
                                void titleOverlay.offsetWidth; // Reflow
                                titleOverlay.classList.remove('hide-anim'); // Ensure no hide animation is running
                                titleOverlay.classList.add('show');
                                titleOverlay.style.pointerEvents = 'auto';

                                // Create and show description overlay for the new item (now subheading)
                                const descOverlay = createLightboxOverlay(newSubheading, 'bottom', newLinkType, newLinkUrl);
                                wrapper.appendChild(descOverlay);
                                void descOverlay.offsetWidth; // Reflow
                                descOverlay.classList.remove('hide-anim'); // Ensure no hide animation is running
                                descOverlay.classList.add('show');
                                descOverlay.style.pointerEvents = 'auto';
                            };
                            if (skipFadeIn) {
                                setTimeout(createAndShowOverlays, 600);
                            } else {
                                createAndShowOverlays();
                            }
                        }
                        // If overlays are already visible, do nothing (prevents flash)
                    } else {
                        // If userPrefersDescriptionVisible is false, old overlays were removed above,
                        // and no new ones are created. The initial hide animations for the *outgoing*
                        // item's overlays are handled at the start of openLightboxByIndex.
                        wrapper.querySelectorAll('.lightbox-title-overlay, .lightbox-description-overlay').forEach(o => o.remove());
                    }
                }
                
                // --- Update non-animated details in #lightbox-details (title, subheading) ---
                updateLightboxDetails(title, dynamicSubheading, isDesktop() ? null : (mobileDescription || desktopDescription));

                sendMessageToParent({ type: 'description-state', open: isDesktop() });
                // Send lightbox state including link type and URL, and the persistent description visibility
                sendMessageToParent({ 
                    type: 'lightbox-state', 
                    open: true, 
                    linkType: linkType || null, 
                    linkUrl: linkUrl || null    
                });
                sendMessageToParent({ type: 'description-state', open: userPrefersDescriptionVisible });
                if (linkType && linkUrl) {
                    sendMessageToParent({ type: 'set-external-link-enabled', enabled: true, url: linkUrl });
                } else {
                    sendMessageToParent({ type: 'set-external-link-enabled', enabled: false });
                }
            }
        }

        // --- Animate out old media ---
            if (oldMedia) {
            if (!(skipFadeIn && !isDesktop())) { // Standard fade-out
                oldMedia.style.transition = 'opacity 180ms cubic-bezier(0.4,0,0.2,1)';
                oldMedia.style.opacity = '0';
                let handled = false;
                function onFade(e) { // Event handler for transition end
                    if (handled) return;
                    if (e && (e.target !== oldMedia || e.propertyName !== 'opacity')) return;
                    handled = true;
                    oldMedia.removeEventListener('transitionend', onFade);
                    mediaFaded = true; // Mark old media as faded
                    trySwapInNewContent(); // Check if ready to swap
                }
                oldMedia.addEventListener('transitionend', onFade);
                setTimeout(() => { if (!handled) { onFade(); } }, 250); // Fallback timer
            } else {
                // On mobile swipe, remove instantly (no fade for old media if new one slides)
                oldMedia.remove();
                mediaFaded = true;
                trySwapInNewContent();
            }
            } else {
            mediaFaded = true; // No old media to animate
        }

        // --- Animate out old description card (desktop only) ---
        if (oldAnimWrapper) {
            // Animate opacity and transform of the card itself
            if (oldDescCard) {
                oldDescCard.style.opacity = '0';
                oldDescCard.style.transform = 'translateX(-40px)';
            }
            // Animate the width of the animation wrapper to 0 to hide it
            oldAnimWrapper.style.transition = 'width 0.25s cubic-bezier(0.4,0,0.2,1)'; // Reduced from 0.4s
            oldAnimWrapper.style.width = '0px';
            let handled = false;
            const onOldWrapperTransitionEnd = (e) => { // Event handler for transition end
                if (handled || (e && (e.target !== oldAnimWrapper || e.propertyName !== 'width'))) {
                    return; 
                }
                handled = true;
                oldAnimWrapper.removeEventListener('transitionend', onOldWrapperTransitionEnd);
                if (oldAnimWrapper.parentNode) {
                    oldAnimWrapper.remove(); // Remove from DOM
                }
                descCardFadedOut = true; // Mark old description card as faded
                trySwapInNewContent(); // Check if ready to swap
            };
            oldAnimWrapper.addEventListener('transitionend', onOldWrapperTransitionEnd);
            // Fallback timeout in case transitionend doesn't fire
            setTimeout(() => {
                if (!handled) {
                    handled = true; 
                    oldAnimWrapper.removeEventListener('transitionend', onOldWrapperTransitionEnd); 
                    if (oldAnimWrapper.parentNode) {
                        oldAnimWrapper.remove();
                    }
                    descCardFadedOut = true;
                    trySwapInNewContent();
                }
            }, 300); // Reduced from 450ms to 300ms
        } else {
            descCardFadedOut = true; // No old description card to animate
        }
        trySwapInNewContent(); // Initial check in case there was nothing to animate out
    }

    // Modify the post click handler to only open the lightbox
    posts.forEach((post, idx) => {
        post.addEventListener('click', (event) => {
            if (event.target.tagName === 'A') {
                return;
            }
            currentLightboxIndex = idx; // Set current index here
            
            // Simplified call to openLightbox as it no longer needs explicit data passed
            const type = post.dataset.type; // Still need to check if post is valid to open
            const sourceData = post.dataset.src; // Still need to check if post is valid to open
            if (type && sourceData) {
                openLightbox();
            }
        });
    });

    // Hide overlays when clicking outside any post
    window.addEventListener('click', (event) => {
        if (!event.target.closest('.post')) {
            posts.forEach(p => p.classList.remove('show-caption'));
        }
    });

    // --- Smooth Drag/Swipe Logic for Mobile Lightbox ---

    /**
     * Applies transform to the lightbox content for swipe effect.
     * @param {number} dx - Horizontal translation in px.
     * @param {number} dy - Vertical translation in px.
     * @param {number} scale - Content scaling (used for vertical swipe-to-close).
     */
    function setSwipeContentTransform(dx, dy, scale = 1) {
        if (lightboxContent) {
            lightboxContent.style.transform = `translateX(${dx}px) translateY(${dy}px) scale(${scale})`;
            const media = lightboxContent.querySelector('img, video');
            const titleOverlay = lightboxContent.querySelector('.lightbox-title-overlay.show');
            const descOverlay = lightboxContent.querySelector('.lightbox-description-overlay.show');

            if (media && dragIsVertical) { // Vertical drag for closing
                const fadeEnd = 0.95;
                const dragRatio = Math.min(1, Math.abs(dy) / (window.innerHeight * fadeEnd));
                const fade = 1 - Math.pow(dragRatio, 2);
                media.style.opacity = fade;
                lightbox.style.opacity = fade;
                if (titleOverlay) titleOverlay.style.opacity = fade;
                if (descOverlay) descOverlay.style.opacity = fade;
                
                const minScale = 0.25;
                const scaleVal = 1 - (1 - minScale) * dragRatio;
                lightboxContent.style.transform = `translateX(${dx}px) translateY(${dy}px) scale(${scaleVal})`;
            } else if (media) { // Horizontal drag for navigation
                media.style.opacity = '';
                lightboxContent.style.transform = `translateX(${dx}px) translateY(${dy}px) scale(1)`;
                lightbox.style.opacity = '';

                // Fade overlays during horizontal swipe
                const horizontalFadeThreshold = window.innerWidth / 1.8; // Changed from / 3 to / 1.8
                const horizontalDragRatio = Math.min(1, Math.abs(dx) / horizontalFadeThreshold);
                const horizontalFade = 1 - horizontalDragRatio;
                if (titleOverlay) titleOverlay.style.opacity = horizontalFade;
                if (descOverlay) descOverlay.style.opacity = horizontalFade;
            } else {
                 // Reset overlay opacity if no media or not dragging (e.g., initial state before any drag)
                if (titleOverlay) titleOverlay.style.opacity = '';
                if (descOverlay) descOverlay.style.opacity = '';
            }
        }
    }

    // --- Touch Event State Variables ---
    let dragStartX = 0;       // Initial X position of touch
    let dragCurrentX = 0;     // Current X position of touch
    let dragStartY = 0;       // Initial Y position of touch
    let dragCurrentY = 0;     // Current Y position of touch
    let dragging = false;       // Is a drag currently in progress?
    let dragHasMoved = false;   // Has the touch moved significantly from start?
    let lastDragDx = 0;       // Last calculated horizontal delta
    let lastDragDy = 0;       // Last calculated vertical delta
    let dragRAF = null;         // requestAnimationFrame ID for drag updates
    let dragIsVertical = false; // Is the current drag predominantly vertical?

    /**
     * Touch Start: Initialize drag variables
     * @param {TouchEvent} e
     */
    function handleTouchStart(e) {
        if (e.touches.length === 1) { // Single touch only
            dragStartX = e.touches[0].clientX;
            dragCurrentX = dragStartX;
            dragStartY = e.touches[0].clientY;
            dragCurrentY = dragStartY;
            dragging = true;
            dragHasMoved = false;
            dragIsVertical = false;
            lastDragDx = 0;
            lastDragDy = 0;
            if (lightboxContent) {
                lightboxContent.classList.add('swiping');
                lightboxContent.classList.remove('animate');

                // Temporarily disable animations on active overlays during swipe
                const titleOverlay = lightboxContent.querySelector('.lightbox-title-overlay.show');
                const descOverlay = lightboxContent.querySelector('.lightbox-description-overlay.show');
                if (titleOverlay) {
                    titleOverlay.style.animation = 'none';
                    titleOverlay.style.transition = 'none';
                }
                if (descOverlay) {
                    descOverlay.style.animation = 'none';
                    descOverlay.style.transition = 'none';
                }
            }
        }
    }

    /**
     * Touch Move: Update content position based on drag
     * @param {TouchEvent} e
     */
    function handleTouchMove(e) {
        if (!dragging || e.touches.length !== 1) return;
        dragCurrentX = e.touches[0].clientX;
        dragCurrentY = e.touches[0].clientY;
        const dx = dragCurrentX - dragStartX;
        const dy = dragCurrentY - dragStartY;

        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragHasMoved = true; // Register movement

        // Determine drag direction (vertical or horizontal) based on initial dominant movement
        if (!dragIsVertical && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
            dragIsVertical = true;
        } else if (!dragIsVertical && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
            dragIsVertical = false;
        }

        if (lightboxContent && !dragIsVertical) { // Horizontal drag
            setSwipeContentTransform(dx, 0, 1);
        }
        if (lightboxContent && dragIsVertical) { // Vertical drag
            const limitedDy = Math.min(0, dy); // Only allow upward swipe for closing effect
            const minScale = 0.85; // Initial slight scale down on vertical drag start
            const scaleVal = 1 + (minScale - 1) * Math.min(1, Math.abs(limitedDy) / (window.innerHeight / 2));
            lastDragDx = 0;
            lastDragDy = limitedDy;
            if (dragRAF) cancelAnimationFrame(dragRAF);
            // Use requestAnimationFrame for smoother transform updates
            dragRAF = requestAnimationFrame(() => {
                setSwipeContentTransform(0, limitedDy, scaleVal);
            });
        }
    }

    /**
     * Touch End: Determine action (swipe next/prev, swipe close, or snap back)
     */
    function handleTouchEnd(e) {
        if (!dragging) return;
        dragging = false;
        if (dragRAF) cancelAnimationFrame(dragRAF); // Cancel any pending animation frame

        const dx = dragCurrentX - dragStartX;
        const dy = dragCurrentY - dragStartY;
        const media = lightboxContent.querySelector('img, video');

        if (!dragHasMoved) { // This is a TAP
            // For a tap, we don't want to clear the style.animation = 'none' set by handleTouchStart
            // if the overlay is meant to remain static. The function initiating a new animation
            // will be responsible for clearing it.

            // Handle the tap itself based on the target
            if (e && e.target && media && e.target === media) {
                // Tap was on video, let video's click handler (which has stopPropagation) do its thing.
                return;
            }
            // Tap was on lightbox content, but not the video.
            // Keep stopPropagation to prevent potential backdrop click issues.
            if (e) {
                e.stopPropagation();
            }
            return;
        }

        // --- Swiping Logic (if dragHasMoved is true) ---
        let triggerSwipeUp = false;
        let triggerSwipeLeft = false;
        let triggerSwipeRight = false;

        // Determine if swipe thresholds are met based on media's dragged position
        if (media) {
            const rect = media.getBoundingClientRect();
            const draggedBottom = rect.bottom + dy;
            const draggedLeft = rect.left + dx;
            const draggedRight = rect.right + dx;

            // Swipe Up (Close): If media's bottom edge is above vertical center of viewport
            if (
                dragIsVertical &&
                Math.abs(dy) > MIN_SWIPE_DISTANCE &&
                draggedBottom < window.innerHeight / 2 &&
                Math.abs(dy) > Math.abs(dx)
            ) {
                triggerSwipeUp = true;
            }
            // Swipe Left (Next): If media's right edge is left of horizontal center (and horizontal drag)
            if (
                !dragIsVertical &&
                Math.abs(dx) > MIN_SWIPE_DISTANCE &&
                draggedRight < window.innerWidth / 2 &&
                dx < 0 &&
                Math.abs(dx) > Math.abs(dy)
            ) {
                triggerSwipeLeft = true;
            }
            // Swipe Right (Previous): If media's left edge is right of horizontal center (and horizontal drag)
            if (
                !dragIsVertical &&
                Math.abs(dx) > MIN_SWIPE_DISTANCE &&
                draggedLeft > window.innerWidth / 2 &&
                dx > 0 &&
                Math.abs(dx) > Math.abs(dy)
            ) {
                triggerSwipeRight = true;
            }
        }

        // --- Action: Swipe Up to Close ---
        if (triggerSwipeUp) {
            if (lightboxContent) {
                lightboxContent.classList.remove('swiping');
                lightboxContent.classList.add('animate'); // Enable CSS transition for smooth close
                const targetY = -window.innerHeight; // Target position off-screen
                const duration = 400; // Animation duration
                const minScale = 0.25; // Final scale before closing

                // Animate content sliding up and scaling down
                lightboxContent.style.transition = `transform ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
                lightboxContent.style.transform = `translateY(${targetY}px) scale(${minScale})`;
                // Animate lightbox background and media opacity to fade out
                lightbox.style.transition = `opacity ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
                lightbox.style.opacity = 0;
                if (media) media.style.transition = `opacity ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
                if (media) media.style.opacity = 0;

                // After animation, reset styles and close lightbox
                const onTransitionEnd = () => {
                    lightboxContent.removeEventListener('transitionend', onTransitionEnd);
                    lightboxContent.classList.remove('animate');
                    lightboxContent.style.transition = '';
                    lightboxContent.style.transform = 'translateX(0) translateY(0) scale(1)';
                    lightbox.style.transition = '';
                    lightbox.style.opacity = '';
                    if (media) {
                        media.style.transition = '';
                        media.style.opacity = '';
                    }
                    closeLightbox();
                };
                lightboxContent.addEventListener('transitionend', onTransitionEnd);
            }
            return; // Action handled
        }

        // --- Action: Swipe Left (Next) ---
        if (triggerSwipeLeft) {
            if (currentLightboxIndex !== null) {
                const targetX = -window.innerWidth; // Target position off-screen left
                // Calculate dynamic duration based on how much is left to swipe
                const currentX = dx;
                const remaining = Math.abs(targetX - currentX);
                const total = Math.abs(targetX);
                const baseDuration = 450;
                const duration = Math.min(Math.max(180, baseDuration * (remaining / total)), 350);
                
                lightboxContent.classList.add('animate');
                lightboxContent.style.transition = `transform ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
                lightboxContent.style.transform = `translateX(${targetX}px)`;
                lightbox.style.transition = ''; // Reset lightbox opacity for side swipes
                lightbox.style.opacity = '';

                // After animation, reset transform and open next item
                const onTransitionEnd = () => {
                    lightboxContent.removeEventListener('transitionend', onTransitionEnd);
                    lightboxContent.classList.remove('animate');
                    lightboxContent.style.transition = '';
                    lightboxContent.style.transform = `translateX(0)`;
                    openLightboxByIndex(currentLightboxIndex + 1, 1, true); // skipFadeIn = true for slide
                };
                lightboxContent.addEventListener('transitionend', onTransitionEnd);
            }
            return; // Action handled
        }

        // --- Action: Swipe Right (Previous) ---
        if (triggerSwipeRight) {
            if (currentLightboxIndex !== null) {
                const targetX = window.innerWidth; // Target position off-screen right
                // Calculate dynamic duration
                const currentX = dx;
                const remaining = Math.abs(targetX - currentX);
                const total = Math.abs(targetX);
                const baseDuration = 450;
                const duration = Math.min(Math.max(180, baseDuration * (remaining / total)), 350);

                lightboxContent.classList.add('animate');
                lightboxContent.style.transition = `transform ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
                lightboxContent.style.transform = `translateX(${targetX}px)`;
                lightbox.style.transition = ''; // Reset lightbox opacity
                lightbox.style.opacity = '';

                // After animation, reset transform and open previous item
                const onTransitionEnd = () => {
                    lightboxContent.removeEventListener('transitionend', onTransitionEnd);
                    lightboxContent.classList.remove('animate');
                    lightboxContent.style.transition = '';
                    lightboxContent.style.transform = `translateX(0)`;
                    openLightboxByIndex(currentLightboxIndex - 1, -1, true); // skipFadeIn = true for slide
                };
                lightboxContent.addEventListener('transitionend', onTransitionEnd);
            }
            return; // Action handled
        }

        // --- No Action: Snap Back ---
        // If no swipe threshold was met, animate content back to its original position.
        if (lightboxContent) {
            lightboxContent.classList.add('animate'); // Enable CSS transition for snap back
            lightboxContent.style.transform = 'translateX(0) translateY(0) scale(1)';
            lightboxContent.style.transition = ''; // Use default transition from .animate or specific snap-back
            if (media) media.style.opacity = ''; // Reset media opacity
            lightbox.style.transition = ''; // Reset lightbox opacity
            lightbox.style.opacity = '';

            // Reset overlay opacity and animations on snap back
            const titleOverlay = lightboxContent.querySelector('.lightbox-title-overlay'); 
            const descOverlay = lightboxContent.querySelector('.lightbox-description-overlay');
            
            if (titleOverlay) {
                titleOverlay.style.animation = ''; // Restore CSS animations capability
                titleOverlay.style.transition = ''; // Restore CSS transitions capability
            }
            if (descOverlay) {
                descOverlay.style.animation = '';
                descOverlay.style.transition = '';
            }

            if (userPrefersDescriptionVisible) {
                // Ensure overlays are visible and have .show class if they should be seen
                // The .show class should already be there if they were visible before drag started
                if (titleOverlay && titleOverlay.classList.contains('show')) titleOverlay.style.opacity = '1';
                if (descOverlay && descOverlay.classList.contains('show')) descOverlay.style.opacity = '1';
            } else {
                if (titleOverlay) titleOverlay.style.opacity = '0';
                if (descOverlay) descOverlay.style.opacity = '0';
            }
        }
    }

    // Attach touch listeners to the lightboxContent
    if (lightboxContent) {
        lightboxContent.addEventListener('touchstart', handleTouchStart, { passive: true });
        lightboxContent.addEventListener('touchmove', handleTouchMove, { passive: true });
        // Pass event to handleTouchEnd so we can check event.target
        lightboxContent.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    // Listen for taps/clicks on the lightbox background to close
    lightbox.addEventListener('click', (event) => {
        if (event.target === lightbox) {
            closeLightbox();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && lightbox.style.display === 'flex') {
            closeLightbox();
        }
    });

    const feedContainerPosts = Array.from(feedContainer.querySelectorAll('.post'));

    function applyMasonryLayout() {
        if (!feedContainer || feedContainerPosts.length === 0) {
            return;
        }

        const containerStyle = getComputedStyle(feedContainer);
        const containerPaddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
        const containerPaddingTop = parseFloat(containerStyle.paddingTop) || 0;
        const containerPaddingRight = parseFloat(containerStyle.paddingRight) || 0;
        const containerPaddingBottom = parseFloat(containerStyle.paddingBottom) || 0;

        const availableWidth = feedContainer.offsetWidth - containerPaddingLeft - containerPaddingRight;
        
        let numColumns = 2; // Default for mobile
        const gap = 12; // Gap between posts, both horizontally and vertically

        if (feedContainer.offsetWidth >= 1200) {
            numColumns = 4;
        } else if (feedContainer.offsetWidth >= 768) {
            numColumns = 3;
        }

        const columnWidth = (availableWidth - (numColumns - 1) * gap) / numColumns;

        feedContainerPosts.forEach(post => {
            post.style.position = 'absolute'; 
            post.style.width = `${columnWidth}px`;
        });

        const columnHeights = Array(numColumns).fill(0);

        feedContainerPosts.forEach(post => {
            const postHeight = post.offsetHeight;
            
            let shortestColumnIndex = 0;
            for (let i = 1; i < numColumns; i++) {
                if (columnHeights[i] < columnHeights[shortestColumnIndex]) {
                    shortestColumnIndex = i;
                }
            }

            post.style.left = `${containerPaddingLeft + shortestColumnIndex * (columnWidth + gap)}px`;
            post.style.top = `${containerPaddingTop + columnHeights[shortestColumnIndex]}px`;

            columnHeights[shortestColumnIndex] += postHeight + gap;
        });

        const effectiveColumnHeights = columnHeights.map(h => h > 0 ? h - gap : 0);
        const tallestColumnContentHeight = Math.max(0, ...effectiveColumnHeights);
        
        feedContainer.style.height = `${containerPaddingTop + tallestColumnContentHeight + containerPaddingBottom}px`;
    }

    function initMasonryWithVideoCheck() {
        if (!feedContainer) return;

        const videos = feedContainerPosts.filter(post => post.querySelector('video')).map(post => post.querySelector('video'));

        if (videos.length === 0) {
            applyMasonryLayout();
            return;
        }

        let videosToMonitor = videos.length;
        let videosReported = 0;

        const onMediaReady = (mediaElement, eventType) => {
            mediaElement.removeEventListener('loadedmetadata', onMediaReadyHandler);
            mediaElement.removeEventListener('loadeddata', onMediaReadyHandler);
            mediaElement.removeEventListener('error', onErrorHandler);
            
            videosReported++;
            if (videosReported === videosToMonitor) {
                applyMasonryLayout();
            }
        };
        
        const onMediaReadyHandler = function(event) { onMediaReady(this, event.type); };
        const onErrorHandler = function(event) { 
            onMediaReady(this, event.type); // Count it as "done" to not block layout
        };

        videos.forEach(video => {
            if (video.readyState >= 2) { // HAVE_CURRENT_DATA (should mean dimensions are available)
                videosReported++;
            } else {
                video.addEventListener('loadedmetadata', onMediaReadyHandler);
                video.addEventListener('loadeddata', onMediaReadyHandler); // For some browsers/cases
                video.addEventListener('error', onErrorHandler);
            }
        });

        if (videosReported === videosToMonitor && videosToMonitor > 0) {
            applyMasonryLayout();
        }
    }

    if (feedContainer) {
        initMasonryWithVideoCheck(); // Initial layout calculation

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            // On resize, assume media dimensions are stable if they were loaded.
            resizeTimeout = setTimeout(applyMasonryLayout, 150); 
        });

        // Safety re-layout after 1.2s to catch late-loading videos (especially on mobile)
        setTimeout(applyMasonryLayout, 1200);

        // Re-apply layout on scroll and touchend (mobile interaction)
        window.addEventListener('scroll', () => {
            setTimeout(applyMasonryLayout, 100);
        });
        window.addEventListener('touchend', () => {
            setTimeout(applyMasonryLayout, 100);
        });

        // Notify parent when ready (first load only)
        // Wait for all images and videos to be loaded, then send message
        const posts = Array.from(feedContainer.querySelectorAll('.post'));
        const mediaElements = posts.map(post => post.querySelector('img, video')).filter(Boolean);
        let loadedCount = 0;
        function checkAllLoaded() {
            loadedCount++;
            if (loadedCount === mediaElements.length) {
                // All media elements have reported (loaded or error)
                // Ensure masonry layout is applied with final dimensions.
                applyMasonryLayout();

                // Short delay to allow rendering and layout stabilization before reveal
                setTimeout(() => {
                    const feedContainer = document.querySelector('.feed-container');
                    if (feedContainer) {
                        feedContainer.classList.add('loaded');
                    }
                    // Notify parent that projects app content is ready and visible
                    sendMessageToParent({ type: 'projects-ready' });
                }, 100); // 100ms delay, adjust if necessary
            }
        }
        if (mediaElements.length > 0) {
            mediaElements.forEach(el => {
                if ((el.tagName === 'IMG' && el.complete) || (el.tagName === 'VIDEO' && el.readyState >= 2)) {
                    checkAllLoaded();
                } else {
                    el.addEventListener('load', checkAllLoaded);
                    el.addEventListener('loadeddata', checkAllLoaded);
                    el.addEventListener('error', checkAllLoaded);
                }
            });
        }
    }

    // --- Video Grid Play/Pause Logic for Maximized/Unmaximized States ---
    const gridVideos = Array.from(document.querySelectorAll('.feed-container .video-post video'));
    let isMaximized = false;
    let intersectionObserver = null;

    function playVisibleVideos() {
        if (!intersectionObserver) return;
        // Find all visible videos
        const visibleVideos = gridVideos.filter(video => video.__isIntersecting);
        // Play ALL visible videos, pause all non-visible ones
        gridVideos.forEach(video => {
            if (video.__isIntersecting) {
                // Attempt to play if intersecting
                if (video.paused) {
                    video.play().catch(error => {
                        // Autoplay was prevented, typically on mobile if not muted or no user interaction yet.
                        // Since videos are muted, this is less likely but good to be aware of.
                        // console.warn("Video autoplay prevented for: ", video.src, error);
                    });
                }
            } else {
                // Pause if not intersecting
                if (!video.paused) {
                    video.pause();
                }
            }
        });
    }

    function setupIntersectionObserver() {
        if (intersectionObserver) intersectionObserver.disconnect();
        intersectionObserver = new window.IntersectionObserver((entries) => {
            entries.forEach(entry => {
                entry.target.__isIntersecting = entry.isIntersecting;
            });
            playVisibleVideos();
        }, { root: document.querySelector('.scroll-content'), threshold: 0.1 });
        gridVideos.forEach(video => {
            intersectionObserver.observe(video);
        });
        playVisibleVideos();
    }

    function cleanupIntersectionObserver() {
        if (intersectionObserver) {
            intersectionObserver.disconnect();
            intersectionObserver = null;
        }
        gridVideos.forEach(video => { delete video.__isIntersecting; });
    }

    function setMaximizedState(maximized) {
        isMaximized = maximized;
        const bodyEl = document.body;
        const maximizedClassName = 'projects-window-maximized';

        if (maximized) {
            bodyEl.classList.add(maximizedClassName);
        } else {
            bodyEl.classList.remove(maximizedClassName);
        }

        // If the lightbox is currently open and the description card is visible (`.lightbox-media-wrapper` has `.desc-visible`):
        // try to force a re-evaluation of its width by toggling a class that affects layout/sizing,
        // or directly re-applying its width based on the new state.
        // This is a more direct attempt to ensure the CSS takes hold.
        const lightboxIsOpen = lightbox && lightbox.style.display === 'flex';
        if (lightboxIsOpen) {
            const mediaWrapper = lightboxContent.querySelector('.lightbox-media-wrapper');
            if (mediaWrapper && mediaWrapper.classList.contains('desc-visible')) {
                const animWrapper = mediaWrapper.querySelector('.desc-card-anim-wrapper');
                if (animWrapper) {
                    // Option C: Simpler - just ensure the transition property is there so it re-evaluates on next CSS match
                    animWrapper.style.transition = 'width 0.4s cubic-bezier(0.4,0,0.2,1)';
                }
            }
        }

        // Existing video grid logic based on the global isMaximized flag
        document.querySelectorAll('.video-post').forEach(post => {
            if (isMaximized) post.classList.add('maximized');
            else post.classList.remove('maximized');
        });
        if (isMaximized) {
            cleanupIntersectionObserver();
            gridVideos.forEach(video => video.play());
        } else {
            gridVideos.forEach(video => video.pause());
            setupIntersectionObserver();
        }
    }

    // Listen for maximize/unmaximize messages from parent
    window.addEventListener('message', (event) => {
        if (event.data && typeof event.data.type === 'string') {
            if (event.data.type === 'window:maximized') {
                setMaximizedState(true);
            } else if (event.data.type === 'window:unmaximized') {
                setMaximizedState(false);
            } else if (event.data.type === 'window:restored') {
                console.log('[ProjectsApp] Received window:restored event. Re-applying Masonry layout.');
                // Re-apply the Masonry layout. Using requestAnimationFrame to ensure it runs
                // after the browser has had a chance to update dimensions from the restore.
                requestAnimationFrame(() => {
                    if (typeof applyMasonryLayout === 'function') {
                        applyMasonryLayout();
                    }
                });
            }
            // Keep existing toolbar-action handling
            if (event.data.type === 'toolbar-action') {
                if (event.data.action === 'viewDescription') {
                    const wrapper = lightboxContent.querySelector('.lightbox-media-wrapper');
                    let description = '';
                    if (currentLightboxIndex !== null && allPosts[currentLightboxIndex]) {
                        // If on mobile, show subheading in the bottom overlay
                        const currentPostData = allPosts[currentLightboxIndex].dataset;
                        if (isTouchDevice()) {
                            const title = currentPostData.title || '';
                            // Use the same subheading logic as desktop
                            const subheading = getSubheadingName(title);
                            const linkTypeFromData = currentPostData.linkType;
                            const linkUrlFromData = currentPostData.linkUrl;
                            // Pass the wrapper to the generalized toggle function, using subheading for the bottom overlay
                            toggleMobileOverlays(title, subheading, wrapper, linkTypeFromData, linkUrlFromData);
                        } else {
                            // Desktop: only toggle the description card via the existing logic
                            let descForDesktopCard = currentPostData.description || '';
                            toggleLightboxOverlay(descForDesktopCard, wrapper); // Call original logic for desktop card
                        }
                    }
                } else if (event.data.action === 'navigateHome') {
                    if (lightbox && lightbox.style.display === 'flex') {
                        closeLightbox();
                    }
                } else if (event.data.action === 'navigatePrevious') {
                    if (lightbox && lightbox.style.display === 'flex' && allPosts.length > 0) {
                        let newIndex = (currentLightboxIndex - 1 + allPosts.length) % allPosts.length;
                        openLightboxByIndex(newIndex, -1);
                    }
                } else if (event.data.action === 'navigateNext') {
                    if (lightbox && lightbox.style.display === 'flex' && allPosts.length > 0) {
                        let newIndex = (currentLightboxIndex + 1) % allPosts.length;
                        openLightboxByIndex(newIndex, 1);
                    }
                }
            }
        }
    });

    // Initialize for default (unmaximized) state
    setupIntersectionObserver();

    // Expose closeLightbox globally for message handler
    window.closeLightbox = closeLightbox;

    document.addEventListener('click', (event) => {
        // Optionally: filter out clicks inside your own popouts/menus if needed
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'iframe-interaction' }, '*');
        }
    });

    // Helper to extract person/team name for subheading
    function getSubheadingName(title) {
        // Add custom mappings for all projects
        if (/mavs win/i.test(title)) return "Dallas Mavericks";
        if (/all blacks/i.test(title)) return "New Zealand All Blacks";
        if (/sua'?ali'i/i.test(title)) return "Joseph Sua'ali'i";
        if (/mahomes/i.test(title)) return "Patrick Mahomes";
        if (/flashback/i.test(title)) return "Dwayne Wade";
        if (/minnesota/i.test(title)) return "Edwards & Justin";
        if (/saquon/i.test(title)) return "Saquon Barkley";
        if (/blues/i.test(title)) return "Auckland Blues";
        if (/bryant/i.test(title)) return "Kobe Bryant";
        if (/barkley big head/i.test(title)) return "Saquon Barkley";
        // Fallback: use first 2 words
        return title.split(/\s+/).slice(0,2).join(' ');
    }
});
