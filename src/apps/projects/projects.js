// ==================================================
//  projects.js — Projects App Interactivity for Windows XP Simulation
// ==================================================
/**
 * Handles lightbox, masonry layout, and interactivity for the My Projects app.
 * Loaded as an iframe in the main shell.
 * @file projects.js
 */

// ===== Global State & Utility Functions =====
// Global state for persistent description visibility
let userPrefersDescriptionVisible = false;

// --- Global mute preference for lightbox videos ---
let userPrefersMuted = true; // Default: videos start muted
if (isDesktop() && window.sessionStorage && sessionStorage.getItem('projectsUserPrefersMuted') !== null) {
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
 * @param {string} descriptionText - The project description
 * @param {string} [bulletPointsText] - Optional pipe-separated string of bullet points
 * @param {string} [toolsUsedText] - Optional comma-separated string of tools used
 * @returns {HTMLElement} The animated wrapper containing the card
 */
function createDesktopDescriptionCard(titleText, descriptionText, bulletPointsText, toolsUsedText) {
    const animWrapper = createEl('div', 'desc-card-anim-wrapper');
    const descCard = createEl('div', 'lightbox-desc-card');
    clearChildren(descCard);

    const mainContentContainer = createEl('div', 'card-main-content');

    // Add the new "PROJECT" label
    const projectLabelEl = createEl('div', 'card-project-label', 'PERSONAL PROJECT');
    mainContentContainer.appendChild(projectLabelEl);

    if (titleText) {
        const titleEl = createEl('div', 'card-title', titleText);
        mainContentContainer.appendChild(titleEl);

        // Add HR divider below title
        const divider = createEl('hr', 'card-title-divider');
        mainContentContainer.appendChild(divider);
    }

    // Add the new "DESCRIPTION" label
    const descriptionLabelEl = createEl('div', 'card-description-label', 'DESCRIPTION');
    mainContentContainer.appendChild(descriptionLabelEl);

    if (descriptionText) {
        const bodyEl = createEl('div', 'card-body', descriptionText);
        mainContentContainer.appendChild(bodyEl);
    }

    if (bulletPointsText && bulletPointsText.trim() !== "") {
        const bulletPointsContainer = createEl('div', 'card-bullet-points');
        const ul = createEl('ul');
        bulletPointsText.split('|').forEach(pointText => {
            if (pointText.trim()) {
                const li = createEl('li', null, pointText.trim());
                ul.appendChild(li);
            }
        });
        bulletPointsContainer.appendChild(ul);
        mainContentContainer.appendChild(bulletPointsContainer);
    }

    descCard.appendChild(mainContentContainer);

    // Add TOOLS USED section (will be wrapped and positioned at the bottom by CSS)
    if (toolsUsedText && toolsUsedText.trim() !== "") {
        const toolsUsedContainer = createEl('div', 'card-tools-section');

        // NEW: Add a divider INSIDE and AT THE TOP of the "TOOLS USED" section
        const toolsDivider = createEl('hr', 'card-title-divider');
        toolsUsedContainer.appendChild(toolsDivider); // Divider is now first child of toolsUsedContainer

        const toolsLabelEl = createEl('div', 'card-tools-label', 'TOOLS USED');
        toolsUsedContainer.appendChild(toolsLabelEl);

        const toolsListEl = createEl('div', 'card-tools-list');
        const toolsArray = toolsUsedText.split(',').map(tool => {
            const trimmedTool = tool.trim();
            if (trimmedTool.length > 0) {
                return trimmedTool.charAt(0).toUpperCase() + trimmedTool.slice(1);
            }
            return trimmedTool; 
        });
        toolsListEl.textContent = toolsArray.join(', '); 
        toolsUsedContainer.appendChild(toolsListEl);
        descCard.appendChild(toolsUsedContainer);
    }

    animWrapper.appendChild(descCard);
    return animWrapper;
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
        if (isDesktop()) {
            videoElement.muted = userPrefersMuted;
            if (userPrefersMuted) {
                videoElement.setAttribute('muted', '');
            } else {
                videoElement.removeAttribute('muted');
            }
        } else {
            videoElement.muted = true;
            videoElement.setAttribute('muted', '');
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
            // Update global preference and persist ONLY on desktop
            if (isDesktop()) {
                userPrefersMuted = videoElement.muted;
                if (window.sessionStorage) {
                    sessionStorage.setItem('projectsUserPrefersMuted', userPrefersMuted);
                }
            }
            showMuteIfPlayed();
        });
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
    function updateLightboxDetails(title, description) {
        clearChildren(lightboxDetails);
        if (title) {
            lightboxDetails.appendChild(createEl('div', null, title)).id = 'lightbox-title';
        }
        // Removed subheading logic
        // Only add description to lightboxDetails if not on desktop (desktop uses animated card)
        if (description && !isDesktop()) {
            const descEl = createEl('div', null, description);
            descEl.id = 'lightbox-description';
            lightboxDetails.appendChild(descEl);
        }
    }

    function openLightbox() {
        // Pause all grid videos ONLY when opening the lightbox
        document.querySelectorAll('.feed-container .video-post video').forEach(v => { v.pause(); });

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
    function createLightboxOverlay(text, position = 'bottom') {
        const className = position === 'top' ? 'lightbox-title-overlay' : 'lightbox-description-overlay';
        const overlay = createEl('div', className);

        if (position === 'top') {
            // Add the "PERSONAL PROJECT" label for top overlays (mobile title)
            const projectLabelEl = createEl('div', 'mobile-overlay-project-label', 'PERSONAL PROJECT');
            overlay.appendChild(projectLabelEl);
        }

        // Add the main text content (title or description)
        const textSpan = createEl('span', className === 'lightbox-title-overlay' ? 'lightbox-overlay-title-text' : '');
        textSpan.innerHTML = text || ''; // Use innerHTML to allow <br>
        overlay.appendChild(textSpan);

        return overlay;
    }

    // function to handle toggling of BOTH mobile overlays (top title, bottom description)
    function toggleMobileOverlays(titleText, descriptionText, _mediaWrapper) { // wrapper param renamed
        const overlayParent = document.getElementById('lightbox-inner-wrapper');
        if (!overlayParent || isDesktop()) return;

        // click handler for tapping on overlays to hide them
        const handleOverlayTap = function(event) { 
            event.stopPropagation(); // Prevent tap from bubbling up

            // Get both overlays, whether tapped or not, if they are currently shown
            const titleToHide = overlayParent.querySelector('.lightbox-title-overlay.show');
            const descToHide = overlayParent.querySelector('.lightbox-description-overlay.show');

            if (titleToHide) {
                titleToHide.style.animation = ''; // Clear inline animation
                titleToHide.style.transition = '';
                titleToHide.classList.remove('show');
                titleToHide.classList.add('hide-anim');
                titleToHide.style.pointerEvents = 'none';
                titleToHide.addEventListener('animationend', function onHide() {
                    this.removeEventListener('animationend', onHide);
                    if (this.parentNode) this.parentNode.removeChild(this);
                }, { once: true });
            }

            if (descToHide) {
                descToHide.style.animation = ''; // Clear inline animation
                descToHide.style.transition = '';
                descToHide.classList.remove('show');
                descToHide.classList.add('hide-anim');
                descToHide.style.pointerEvents = 'none';
                descToHide.addEventListener('animationend', function onHide() {
                    this.removeEventListener('animationend', onHide);
                    if (this.parentNode) this.parentNode.removeChild(this);
                }, { once: true });
            }

            // If at least one was hidden, update state
            if (titleToHide || descToHide) {
                userPrefersDescriptionVisible = false;
                sendMessageToParent({ type: 'description-state', open: false });
                sendMessageToParent({ type: 'throttle-toolbar', key: 'view-description' });
            }
        };

        // --- Handle Top Title Overlay ---
        let titleOverlay = overlayParent.querySelector('.lightbox-title-overlay');
        if (!titleOverlay) { // If it doesn't exist, create and show it
            titleOverlay = createLightboxOverlay(titleText, 'top');
            overlayParent.appendChild(titleOverlay);
            void titleOverlay.offsetWidth; // Reflow
            titleOverlay.classList.remove('hide-anim');
            titleOverlay.classList.add('show');
            titleOverlay.style.pointerEvents = 'auto';
            titleOverlay.removeEventListener('click', handleOverlayTap); // Remove if somehow present
            titleOverlay.addEventListener('click', handleOverlayTap);   // Add tap listener
        } else { // If it exists, toggle its visibility
            if (titleOverlay.classList.contains('show')) {
                titleOverlay.style.animation = '';
                titleOverlay.style.transition = '';
                titleOverlay.classList.remove('show');
                titleOverlay.classList.add('hide-anim');
                titleOverlay.style.pointerEvents = 'none';
                titleOverlay.addEventListener('animationend', function onHide() {
                    this.removeEventListener('animationend', onHide);
                    if (this.parentNode) this.parentNode.removeChild(this);
                }, { once: true });
                // Listener remains, but pointer-events: none will prevent clicks when hidden
            } else {
                titleOverlay.remove(); // Clean up any remnants if we are re-creating it to show
                titleOverlay = createLightboxOverlay(titleText, 'top');
                overlayParent.appendChild(titleOverlay); 
                void titleOverlay.offsetWidth; 
                titleOverlay.classList.remove('hide-anim');
                titleOverlay.classList.add('show');
                titleOverlay.style.pointerEvents = 'auto';
                titleOverlay.removeEventListener('click', handleOverlayTap);
                titleOverlay.addEventListener('click', handleOverlayTap); // Add tap listener
            }
        }

        // --- Handle Bottom Description Overlay (similar logic) ---
        let descOverlay = overlayParent.querySelector('.lightbox-description-overlay'); 
        if (!descOverlay) { // If it doesn't exist, create and show it
            const currentPostDataForOverlay = allPosts[currentLightboxIndex] ? allPosts[currentLightboxIndex].dataset : {};
            const actualDescriptionForOverlay = currentPostDataForOverlay.mobileDescription || currentPostDataForOverlay.description || '';
            descOverlay = createLightboxOverlay(actualDescriptionForOverlay, 'bottom');
            overlayParent.appendChild(descOverlay); 
            void descOverlay.offsetWidth; 
            descOverlay.classList.remove('hide-anim');
            descOverlay.classList.add('show');
            descOverlay.style.pointerEvents = 'auto';
            descOverlay.removeEventListener('click', handleOverlayTap);
            descOverlay.addEventListener('click', handleOverlayTap); // Add tap listener
        } else { // If it exists, toggle its visibility
            if (descOverlay.classList.contains('show')) {
                descOverlay.style.animation = '';
                descOverlay.style.transition = '';
                descOverlay.classList.remove('show');
                descOverlay.classList.add('hide-anim');
                descOverlay.style.pointerEvents = 'none';
                descOverlay.addEventListener('animationend', function onHide() {
                    this.removeEventListener('animationend', onHide);
                    if (this.parentNode) this.parentNode.removeChild(this);
                }, { once: true });
            } else {
                descOverlay.remove(); // Clean up any remnants if we are re-creating it to show
                const currentPostDataForOverlay = allPosts[currentLightboxIndex] ? allPosts[currentLightboxIndex].dataset : {};
                const actualDescriptionForOverlay = currentPostDataForOverlay.mobileDescription || currentPostDataForOverlay.description || '';
                descOverlay = createLightboxOverlay(actualDescriptionForOverlay, 'bottom');
                overlayParent.appendChild(descOverlay);
                void descOverlay.offsetWidth;
                descOverlay.classList.remove('hide-anim');
                descOverlay.classList.add('show');
                descOverlay.style.pointerEvents = 'auto';
                descOverlay.removeEventListener('click', handleOverlayTap);
                descOverlay.addEventListener('click', handleOverlayTap); // Add tap listener
            }
        }

        // After handling both overlays, update the persistent state based on their visibility
        const currentlyVisibleTitle = overlayParent.querySelector('.lightbox-title-overlay.show');
        const currentlyVisibleDesc = overlayParent.querySelector('.lightbox-description-overlay.show');
        userPrefersDescriptionVisible = (currentlyVisibleTitle || currentlyVisibleDesc) ? true : false;
        
        sendMessageToParent({ type: 'description-state', open: userPrefersDescriptionVisible });
        // Throttle the toolbar button in the parent shell (for visual feedback)
        sendMessageToParent({ type: 'throttle-toolbar', key: 'view-description' });
    }

    function toggleLightboxOverlay(descriptionIgnored, wrapper) { // description parameter is now ignored for desktop card content
        if (!wrapper) return;
        if (isDesktop()) {
            const isCurrentlyVisible = wrapper.classList.contains('desc-visible');

            if (isCurrentlyVisible) { // HIDING LOGIC
                wrapper.classList.remove('desc-visible');
                userPrefersDescriptionVisible = false; 
                sendMessageToParent({ type: 'description-state', open: false });
            } else { // SHOWING LOGIC
                let animWrapper = wrapper.querySelector('.desc-card-anim-wrapper');
                
                if (!animWrapper) {
                    const currentPostData = allPosts[currentLightboxIndex] ? allPosts[currentLightboxIndex].dataset : {};
                    animWrapper = createDesktopDescriptionCard(
                        currentPostData.title, 
                        currentPostData.description, 
                        currentPostData.bulletPoints, // Pass bullet points
                        currentPostData.toolsUsed // Pass tools used
                    );
                    wrapper.appendChild(animWrapper);
                }
                
                if (animWrapper) {
                    animWrapper.style.width = ''; 
                    void animWrapper.offsetHeight; 
                }
                
                wrapper.classList.add('desc-visible');
                userPrefersDescriptionVisible = true; 
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
        const bulletPoints = post.dataset.bulletPoints; // Get bullet points
        const toolsUsed = post.dataset.toolsUsed; // Get tools used

        // Always use a persistent wrapper for lightbox media and description
        const wrapper = getOrCreateWrapper();

        // --- Animation Coordination for Content Swap ---
        // Flags to track if old media and description card have finished their exit animations.
        const oldMedia = wrapper.querySelector('img, video');
        const oldAnimWrapper = wrapper.querySelector('.desc-card-anim-wrapper');
        const oldDescCard = oldAnimWrapper ? oldAnimWrapper.querySelector('.lightbox-desc-card') : null;
        let mediaFaded = !oldMedia; // True if no old media to animate out
        let descCardFadedOut = !oldAnimWrapper; // True if no old description card anim wrapper to animate out
        let mobileTitleOverlayFadedOut = true; // Assume true if not mobile or no overlay
        let mobileDescOverlayFadedOut = true; // Assume true if not mobile or no overlay

        // If this is a navigation call (not initial open), and old content exists,
        // we treat the old content as "ready to be replaced" for the purpose of trySwapInNewContent.
        // Touch navigation handles its own slide-out animation *before* calling this function.
        // Toolbar navigation currently has no specific fade-out of old content *before* calling this.
        if (direction !== 0) { // 0 is initial open, 1 or -1 is navigation
            if (oldMedia) { // If old media element exists
                mediaFaded = true;
            }
            if (oldAnimWrapper) { // If old description card's animation wrapper exists
                descCardFadedOut = true;
            }
        }

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

        // --- Mobile Overlays: Cleanup after swipe OR Trigger hide animation for non-swipe ---
        if (isTouchDevice()) {
            const overlayParentForQuery = document.getElementById('lightbox-inner-wrapper'); 
            if (overlayParentForQuery) {
                if (direction !== 0) { // It's a swipe that navigated
                    // Overlays were already faded by setSwipeContentTransform during the swipe.
                    // Just remove them directly to prevent animation conflicts.
                    const titleToRemove = overlayParentForQuery.querySelector('.lightbox-title-overlay');
                    if (titleToRemove) titleToRemove.remove();
                    mobileTitleOverlayFadedOut = true; // Mark as done immediately

                    const descToRemove = overlayParentForQuery.querySelector('.lightbox-description-overlay');
                    if (descToRemove) descToRemove.remove();
                    mobileDescOverlayFadedOut = true; // Mark as done immediately
                } else { 
                    // Not a swipe: Use original logic for CSS animation hide (e.g., for initial open if applicable)
                    const activeTitleOverlay = overlayParentForQuery.querySelector('.lightbox-title-overlay.show');
                    if (activeTitleOverlay) {
                        mobileTitleOverlayFadedOut = false; // Mark as needing to fade via CSS
                        activeTitleOverlay.style.animation = ''; 
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
                        setTimeout(() => { 
                            if (!titleOverlayHandled) {
                                if (activeTitleOverlay && activeTitleOverlay.parentNode) activeTitleOverlay.remove();
                                mobileTitleOverlayFadedOut = true;
                                trySwapInNewContent();
                            }
                        }, 300); 
                    }

                    const activeDescOverlay = overlayParentForQuery.querySelector('.lightbox-description-overlay.show');
                    if (activeDescOverlay) {
                        mobileDescOverlayFadedOut = false; // Mark as needing to fade via CSS
                        activeDescOverlay.style.animation = ''; 
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
                        setTimeout(() => { 
                            if (!descOverlayHandled) {
                                if (activeDescOverlay && activeDescOverlay.parentNode) activeDescOverlay.remove();
                                mobileDescOverlayFadedOut = true;
                                trySwapInNewContent();
                            }
                        }, 300); 
                    }
                }
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

                let newMedia = createLightboxMediaElement(type, src, poster);

                if (newMedia) {
                    if (!(skipFadeIn && !isDesktop())) { // Desktop toolbar nav & initial desktop open hits this path
                        if (direction !== 0) { // If it's a navigation (not initial open) on desktop
                            newMedia.style.opacity = '0';
                            wrapper.appendChild(newMedia);
                            void newMedia.offsetWidth; // Force reflow
                            newMedia.style.transition = 'opacity 0.5s ease-in-out'; // Slower and smoother
                            newMedia.style.opacity = '1';
                            // Clear the inline transition after it completes
                            setTimeout(() => {
                                if (newMedia && newMedia.style) { // Check if newMedia still exists and has style property
                                    newMedia.style.transition = '';
                                }
                            }, 500); // Updated duration
                        } else { // Initial open on desktop
                            wrapper.appendChild(newMedia);
                            // For initial open, the whole lightbox fades in, so media appears with it.
                        }
                    } else { 
                        // Slide animation for mobile swipe (existing logic)
                        const slideFrom = direction === 1 ? '100vw' : direction === -1 ? '-100vw' : '100vw';
                        newMedia.style.transform = `translateX(${slideFrom})`; // Corrected template literal
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
                        void wrapper.offsetHeight; 
                    }
                    // Pass bulletPoints here when creating the card
                    const newAnimWrapper = createDesktopDescriptionCard(
                        title, 
                        desktopDescription, 
                        bulletPoints,
                        post.dataset.toolsUsed // Pass tools used data
                    ); 
                    wrapper.appendChild(newAnimWrapper);
                    
                    if (userPrefersDescriptionVisible) {
                        void newAnimWrapper.offsetHeight; 
                        wrapper.classList.add('desc-visible');
                    } else {
                        wrapper.classList.remove('desc-visible'); 
                    }
                } else { 
                    const overlayParentForManage = document.getElementById('lightbox-inner-wrapper'); 
                    if (overlayParentForManage) {
                        // Always remove any existing overlays from the new parent before potentially showing new ones
                        overlayParentForManage.querySelectorAll('.lightbox-title-overlay, .lightbox-description-overlay').forEach(o => o.remove());

                        if (userPrefersDescriptionVisible) {
                            // Call toggleMobileOverlays to create/show new overlays for the current item.
                            // This ensures the tap listeners are correctly attached by toggleMobileOverlays.
                            const postData = allPosts[currentLightboxIndex].dataset;
                            const newTitle = postData.title || '';
                            // The description will be fetched by toggleMobileOverlays itself based on currentLightboxIndex.
                            // The `wrapper` here refers to the `.lightbox-media-wrapper` which is `_mediaWrapper` in toggleMobileOverlays.
                            if (skipFadeIn) {
                                setTimeout(() => {
                                    toggleMobileOverlays(newTitle, "", wrapper); 
                                }, 600);
                            } else {
                                toggleMobileOverlays(newTitle, "", wrapper);
                            }
                        } else {
                            // If overlays are not supposed to be visible, ensure state reflects that (already handled by toggleMobileOverlays if it were called to hide)
                             userPrefersDescriptionVisible = false;
                             sendMessageToParent({ type: 'description-state', open: false });
                        }
                    }
                }
                
                updateLightboxDetails(title, isDesktop() ? null : (mobileDescription || desktopDescription));

                sendMessageToParent({ type: 'description-state', open: isDesktop() });
                sendMessageToParent({ 
                    type: 'lightbox-state', 
                    open: true
                });
                sendMessageToParent({ type: 'description-state', open: userPrefersDescriptionVisible });
            }
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

    /**
     * Applies transform to the lightbox content for swipe effect.
     * @param {number} dx - Horizontal translation in px.
     * @param {number} dy - Vertical translation in px.
     * @param {number} scale - Content scaling (used for vertical swipe-to-close).
     */
    function setSwipeContentTransform(dx, dy, scale = 1, isDownwardHintSwipe = false) {
        if (lightboxContent) {
            const media = lightboxContent.querySelector('img, video');
            const overlayHost = document.getElementById('lightbox-inner-wrapper');
            const titleOverlay = overlayHost?.querySelector('.lightbox-title-overlay.show');
            const descOverlay = overlayHost?.querySelector('.lightbox-description-overlay.show');

            let finalScale = scale; // Default to scale from handleTouchMove

            // Determine if overlays exist and are currently shown (for opacity manipulation)
            const titleOverlayIsVisible = titleOverlay && titleOverlay.classList.contains('show');
            const descOverlayIsVisible = descOverlay && descOverlay.classList.contains('show');

            // Opacity defaults (full opacity)
            if (media) media.style.opacity = '';
            lightbox.style.opacity = '';
            // Default overlay opacity will be handled based on conditions below or by CSS if not touched.
            // Clear any prior JS transitions on overlays before applying new opacity directly for drag.
            if (titleOverlayIsVisible) titleOverlay.style.transition = 'none';
            if (descOverlayIsVisible) descOverlay.style.transition = 'none';

            if (media && dragIsVertical) {
                if (!isDownwardHintSwipe && dy < 0) { // Upward swipe for closing (dy is negative)
                    const fadeEnd = 0.95;
                    const dragRatio = Math.min(1, Math.abs(dy) / (window.innerHeight * fadeEnd));
                    const fade = 1 - Math.pow(dragRatio, 2);
                    
                    media.style.opacity = fade;
                    lightbox.style.opacity = fade;
                    if (titleOverlayIsVisible) titleOverlay.style.opacity = fade;
                    if (descOverlayIsVisible) descOverlay.style.opacity = fade;
                    
                    const minScaleForCloseVisual = 0.25;
                    finalScale = 1 - (1 - minScaleForCloseVisual) * dragRatio;
                } else if (isDownwardHintSwipe && dy > 0) { // Downward hint swipe
                    // Media and lightbox main frame remain full opacity (handled by defaults above)
                    const hintDragRatio = Math.min(1, dy / 40); // dy is capped at 40 for hint in handleTouchMove
                    const hintOverlayOpacity = 1 - (hintDragRatio * 0.5); // Fades to 0.5 at max hint drag

                    if (titleOverlayIsVisible) titleOverlay.style.opacity = hintOverlayOpacity;
                    if (descOverlayIsVisible) descOverlay.style.opacity = hintOverlayOpacity;
                    // finalScale remains `scale` (which is 1 for hint swipe, set in handleTouchMove)
                }
                // For upward swipe with dy=0 or non-hint downward swipe (if that case existed),
                // opacities remain full (reset above), finalScale remains `scale`
            } else if (media && !dragIsVertical) { // Horizontal drag
                // Media and lightbox opacities are already reset to full above.
                // Fade overlays horizontally
                const horizontalFadeThreshold = window.innerWidth / 1.8;
                const horizontalDragRatio = Math.min(1, Math.abs(dx) / horizontalFadeThreshold);
                const horizontalFade = 1 - horizontalDragRatio;
                if (titleOverlayIsVisible) titleOverlay.style.opacity = horizontalFade;
                if (descOverlayIsVisible) descOverlay.style.opacity = horizontalFade;
                // finalScale remains `scale` (which is 1 for horizontal drag)
            }
            // If no media, opacities are already reset to full above. finalScale remains `scale`.

            lightboxContent.style.transform = `translateX(${dx}px) translateY(${dy}px) scale(${finalScale})`;
        }
    }

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

                const overlayHostForTouchStart = document.getElementById('lightbox-inner-wrapper');
                const titleOverlayForTouchStart = overlayHostForTouchStart?.querySelector('.lightbox-title-overlay.show');
                const descOverlayForTouchStart = overlayHostForTouchStart?.querySelector('.lightbox-description-overlay.show');
                
                if (titleOverlayForTouchStart) {
                    titleOverlayForTouchStart.style.animation = 'none';
                    titleOverlayForTouchStart.style.transition = 'none';
                }
                if (descOverlayForTouchStart) {
                    descOverlayForTouchStart.style.animation = 'none';
                    descOverlayForTouchStart.style.transition = 'none';
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

        if (dragRAF) cancelAnimationFrame(dragRAF); // Cancel previous RAF

        if (lightboxContent) {
            if (!dragIsVertical) { // Horizontal drag
                lastDragDx = dx;
                lastDragDy = 0;
                dragRAF = requestAnimationFrame(() => {
                    setSwipeContentTransform(dx, 0, 1, false); // Pass false for isDownwardHintSwipe
                });
            } else { // Vertical drag
                let effectiveDy = dy; 
                let scaleToApply = 1;
                let isHintSwipe = false;

                if (dy < 0) { // Upward swipe (potential close)
                    // effectiveDy is already dy (negative for upward movement)
                    const minScale = 0.85; // Initial slight scale down
                    scaleToApply = 1 + (minScale - 1) * Math.min(1, Math.abs(effectiveDy) / (window.innerHeight / 2));
                    // isHintSwipe remains false
                } else if (dy > 0) { // Downward swipe (hint)
                    effectiveDy = Math.min(dy, 40); // Cap dy for the transform
                    // scaleToApply remains 1 (no scaling for hint)
                    isHintSwipe = true;
                } else { // dy === 0 (no vertical movement)
                    effectiveDy = 0; // Ensure it's exactly 0 for transform
                    // scaleToApply remains 1
                    // isHintSwipe remains false (or could be context-dependent, but false is safe)
                }
                
                lastDragDx = 0;
                lastDragDy = effectiveDy; // Store the (potentially capped) dy
                dragRAF = requestAnimationFrame(() => {
                    setSwipeContentTransform(0, effectiveDy, scaleToApply, isHintSwipe);
                });
            }
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

        if (triggerSwipeLeft) {
            if (currentLightboxIndex !== null) {
                const targetX = -window.innerWidth; // Target position off-screen left
                // Calculate dynamic duration based on how much is left to swipe
                const currentX = dx;
                const remaining = Math.abs(targetX - currentX);
                const total = Math.abs(targetX);
                const baseDuration = 450;
                const duration = Math.min(Math.max(180, baseDuration * (remaining / total)), 350);
                
                // Fade out overlays if they are visible
                const overlayHost = document.getElementById('lightbox-inner-wrapper');
                if (overlayHost) {
                    overlayHost.querySelectorAll('.lightbox-title-overlay.show, .lightbox-description-overlay.show').forEach(overlay => {
                        overlay.style.transition = `opacity ${duration * 0.8}ms ease-out`; // Fade slightly faster than slide
                        overlay.style.opacity = '0';
                        overlay.style.pointerEvents = 'none'; // Disable interaction during fade
                    });
                }

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

        if (triggerSwipeRight) {
            if (currentLightboxIndex !== null) {
                const targetX = window.innerWidth; // Target position off-screen right
                // Calculate dynamic duration
                const currentX = dx;
                const remaining = Math.abs(targetX - currentX);
                const total = Math.abs(targetX);
                const baseDuration = 450;
                const duration = Math.min(Math.max(180, baseDuration * (remaining / total)), 350);

                // Fade out overlays if they are visible
                const overlayHost = document.getElementById('lightbox-inner-wrapper');
                if (overlayHost) {
                    overlayHost.querySelectorAll('.lightbox-title-overlay.show, .lightbox-description-overlay.show').forEach(overlay => {
                        overlay.style.transition = `opacity ${duration * 0.8}ms ease-out`; // Fade slightly faster than slide
                        overlay.style.opacity = '0';
                        overlay.style.pointerEvents = 'none'; // Disable interaction during fade
                    });
                }

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

        if (lightboxContent) {
            lightboxContent.classList.remove('swiping'); // Ensure swiping class is removed
            lightboxContent.classList.add('animate');    // Add .animate class, consistent with other swipe end actions

            // Apply rubber band snap-back for the lightboxContent itself
            const snapDuration = '500ms'; // Duration for the snap
            const rubberBandEasing = 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'; // Easing with overshoot

            lightboxContent.style.transition = `transform ${snapDuration} ${rubberBandEasing}`;
            lightboxContent.style.transform = 'translateX(0) translateY(0) scale(1)';

            // Reset opacity for media and the main lightbox frame
            if (media) {
                media.style.transition = ''; // Clear its specific transition if set during close attempt
                media.style.opacity = '';    // Reset to full
            }
            lightbox.style.transition = ''; // Reset lightbox opacity
            lightbox.style.opacity = '';

            // Reset overlay opacity and animations on snap back
            const overlayHost = document.getElementById('lightbox-inner-wrapper');
            if (overlayHost) {
                const titleOverlay = overlayHost.querySelector('.lightbox-title-overlay');
                const descOverlay = overlayHost.querySelector('.lightbox-description-overlay');

                const resetOverlay = (overlay) => {
                    if (overlay) {
                        overlay.style.animation = '';   // Clear any JS-set animation styles
                        // overlay.style.transition = ''; // Will be cleared specifically after potential fade-in
                        if (overlay.classList.contains('show')) {
                            // 1. Explicitly stop any CSS @keyframe animations.
                            overlay.style.animation = 'none';
                            // 2. Force transform to the final "open" state before opacity transition.
                            overlay.style.transform = 'translateY(0)';

                            // If opacity was reduced (e.g., during hint swipe), smoothly fade it back.
                            const currentOpacity = parseFloat(overlay.style.opacity);
                            if (!isNaN(currentOpacity) && currentOpacity < 1) {
                                overlay.style.transition = 'opacity 300ms ease-out';
                                overlay.style.opacity = '1';

                                const onOverlayFadeInEnd = (ev) => {
                                    if (ev.target === overlay && ev.propertyName === 'opacity') {
                                        overlay.removeEventListener('transitionend', onOverlayFadeInEnd);
                                        overlay.style.transition = ''; // Clear our inline transition
                                    }
                                };
                                overlay.addEventListener('transitionend', onOverlayFadeInEnd);
                                // Fallback timeout for cleanup
                                setTimeout(() => {
                                    if (overlay.style.transition.includes('opacity')) {
                                        overlay.style.transition = '';
                                    }
                                }, 350); // A bit longer than the transition
                            } else {
                                overlay.style.opacity = '1'; // Ensure full opacity if it wasn't changed or is already 1
                                overlay.style.transition = ''; // Clear any stray transitions
                            }
                        } else {
                            overlay.style.opacity = '0';
                            overlay.style.transition = ''; // Clear any stray transitions
                        }
                    }
                };
                resetOverlay(titleOverlay);
                resetOverlay(descOverlay);
            }

            // Clean up the inline transition on lightboxContent after it finishes
            const onSnapBackEnd = (event) => {
                if (event.target === lightboxContent && event.propertyName === 'transform') {
                    lightboxContent.removeEventListener('transitionend', onSnapBackEnd);
                    lightboxContent.style.transition = ''; // Clear the inline transform transition
                    lightboxContent.classList.remove('animate'); // Remove .animate, consistent with swipe-left/right
                }
            };
            lightboxContent.addEventListener('transitionend', onSnapBackEnd);
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

    // Helper to check if the lightbox is open
    function isLightboxOpen() {
        const lightbox = document.getElementById('project-lightbox');
        return lightbox && lightbox.style.display === 'flex';
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
        const lightboxIsOpen = isLightboxOpen();
        if (lightboxIsOpen) {
            gridVideos.forEach(video => video.pause());
        } else {
            // Only play grid videos if lightbox is closed
            if (isMaximized) {
                cleanupIntersectionObserver();
                gridVideos.forEach(video => video.play());
            } else {
                gridVideos.forEach(video => video.pause());
                setupIntersectionObserver();
            }
        }

        // ... existing code for resizing description card ...
        const lightbox = document.getElementById('project-lightbox');
        const lightboxContent = document.getElementById('lightbox-content');
        const lightboxIsOpenForCard = lightbox && lightbox.style.display === 'flex';
        if (lightboxIsOpenForCard) {
            const mediaWrapper = lightboxContent.querySelector('.lightbox-media-wrapper');
            if (mediaWrapper && mediaWrapper.classList.contains('desc-visible')) {
                const animWrapper = mediaWrapper.querySelector('.desc-card-anim-wrapper');
                if (animWrapper) {
                    animWrapper.style.transition = 'width 0.4s cubic-bezier(0.4,0,0.2,1)';
                }
            }
        }

        document.querySelectorAll('.video-post').forEach(post => {
            if (isMaximized) post.classList.add('maximized');
            else post.classList.remove('maximized');
        });
    }

    // Listen for maximize/unmaximize messages from parent
    window.addEventListener('message', (event) => {
        if (event.data && typeof event.data.type === 'string') {
            if (event.data.type === 'window:maximized') {
                setMaximizedState(true);
            } else if (event.data.type === 'window:unmaximized') {
                setMaximizedState(false);
            } else if (event.data.type === 'window:restored') {
                // Re-apply the Masonry layout. Using requestAnimationFrame to ensure it runs
                // after the browser has had a chance to update dimensions from the restore.
                requestAnimationFrame(() => {
                    if (typeof applyMasonryLayout === 'function') {
                        applyMasonryLayout();
                    }
                });
            }
            if (event.data.type === 'toolbar-action') {
                if (event.data.action === 'viewDescription') {
                    const wrapper = lightboxContent.querySelector('.lightbox-media-wrapper');
                    let description = '';
                    if (currentLightboxIndex !== null && allPosts[currentLightboxIndex]) {
                        // If on mobile, show subheading in the bottom overlay
                        const currentPostData = allPosts[currentLightboxIndex].dataset;
                        if (isTouchDevice()) {
                            const titleForToggle = currentPostData.title || '';
                            // The 'descriptionText' for toggleMobileOverlays will be the actual description.
                            // The title for the top overlay is titleForToggle.
                            // The description for the bottom overlay will be fetched inside toggleMobileOverlays itself.
                            const linkTypeFromData = currentPostData.linkType;
                            const linkUrlFromData = currentPostData.linkUrl;
                            // Pass the wrapper to the generalized toggle function, using subheading for the bottom overlay
                            toggleMobileOverlays(titleForToggle, "", wrapper);
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
});
