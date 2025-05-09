// JavaScript for Projects App Lightbox

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

function createDesktopDescriptionCard(titleText, subheadingText, descriptionText) {
    const animWrapper = createEl('div', 'desc-card-anim-wrapper');
    const descCard = createEl('div', 'lightbox-desc-card');
    
    // Clear any existing content (though typically it's new)
    clearChildren(descCard);

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

function createLightboxMediaElement(type, src) {
    let mediaElement;
    if (type === 'image') {
        mediaElement = createEl('img');
        mediaElement.alt = 'Project Lightbox Image'; // Generic alt text
    } else if (type === 'video') {
        mediaElement = createEl('video');
        mediaElement.alt = 'Project Lightbox Video'; // Generic alt text
        mediaElement.controls = true;
        mediaElement.autoplay = true;
        mediaElement.loop = true;
        mediaElement.setAttribute('playsinline', '');
    }
    if (mediaElement) {
        mediaElement.src = src;
    }
    return mediaElement;
}

document.addEventListener('DOMContentLoaded', () => {
    const lightbox = document.getElementById('project-lightbox');
    const lightboxContent = document.getElementById('lightbox-content');
    const lightboxDetails = document.getElementById('lightbox-details');
    const posts = document.querySelectorAll('.post');
    const feedContainer = document.querySelector('.feed-container');

    if (!lightbox || !lightboxContent || !lightboxDetails || !feedContainer) {
        return;
    }

    function setHomeButtonEnabledInParent(enabled) {
        sendMessageToParent({ type: 'set-home-enabled', enabled });
    }

    function isDesktop() {
        return window.matchMedia('(min-width: 768px)').matches;
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

        // Notify parent that lightbox is closed (disable back/forward/desc)
        sendMessageToParent({ type: 'lightbox-state', open: false });
    }

    // --- Lightbox Description Overlay ---
    function createLightboxOverlay(description) {
        const overlay = document.createElement('div');
        overlay.className = 'lightbox-caption-overlay';
        overlay.textContent = description || '';
        overlay.style.pointerEvents = 'none'; // Always non-blocking by default
        return overlay;
    }

    function toggleLightboxOverlay(description, wrapper) {
        if (!wrapper) return;
        if (isDesktop()) {
            // For desktop, visibility is controlled by .desc-visible on the wrapper.
            // The CSS transitions on .desc-card-anim-wrapper (width) and .lightbox-desc-card (opacity/transform)
            // are scoped under .lightbox-media-wrapper.desc-visible.

            const isCurrentlyVisible = wrapper.classList.contains('desc-visible');

            if (isCurrentlyVisible) { // HIDING LOGIC
                wrapper.classList.remove('desc-visible');
                sendMessageToParent({ type: 'description-state', open: false });
            } else { // SHOWING LOGIC
                let animWrapper = wrapper.querySelector('.desc-card-anim-wrapper');
                let card = animWrapper ? animWrapper.querySelector('.lightbox-desc-card') : null;

                if (!animWrapper) {
                    // Fetch current post data if we need to create everything new
                    const currentPostData = allPosts[currentLightboxIndex] ? allPosts[currentLightboxIndex].dataset : {};
                    animWrapper = createDesktopDescriptionCard(currentPostData.title, currentPostData.subheading, currentPostData.description);
                    wrapper.appendChild(animWrapper);
                    card = animWrapper.querySelector('.lightbox-desc-card'); 
                } else if (!card && animWrapper) { 
                    while (animWrapper.firstChild) animWrapper.removeChild(animWrapper.firstChild);
                    const currentPostData = allPosts[currentLightboxIndex] ? allPosts[currentLightboxIndex].dataset : {};
                    const newCardElement = createDesktopDescriptionCard(currentPostData.title, currentPostData.subheading, currentPostData.description).querySelector('.lightbox-desc-card');
                    animWrapper.appendChild(newCardElement);
                    card = newCardElement;
                } 
                
                // Ensure text content is set on the card (now handled by creation, but good for updates if we add that)
                if (card) {
                    // If card exists, but children are missing, or text needs update (e.g. if desc could change dynamically)
                    // This part might need enhancement if card content can change without full recreation
                    const currentPostData = allPosts[currentLightboxIndex] ? allPosts[currentLightboxIndex].dataset : {};
                    clearChildren(card); // Clear old single text node if any
                    if (currentPostData.title) card.appendChild(createEl('div', 'card-title', currentPostData.title));
                    if (currentPostData.subheading) card.appendChild(createEl('div', 'card-subheading', currentPostData.subheading));
                    if (currentPostData.description) card.appendChild(createEl('div', 'card-body', currentPostData.description));
                }
                
                if (animWrapper) {
                    animWrapper.style.width = ''; // Clear any inline width from previous operations
                    void animWrapper.offsetHeight; // Force reflow to establish current state before transition
                }
                
                wrapper.classList.add('desc-visible');
                sendMessageToParent({ type: 'description-state', open: true });
            }
        } else {
            // Mobile: use the old overlay logic (assumed to be working correctly)
            let overlay = wrapper.querySelector('.lightbox-caption-overlay');
            if (!overlay) {
                overlay = createLightboxOverlay(description);
                wrapper.appendChild(overlay);
                void overlay.offsetWidth;
                overlay.classList.remove('hide-anim');
                overlay.classList.add('show');
                overlay.style.pointerEvents = 'auto';
                sendMessageToParent({ type: 'description-state', open: true });
            } else {
                if (overlay.classList.contains('show')) {
                    overlay.classList.remove('show');
                    overlay.classList.add('hide-anim');
                    overlay.style.pointerEvents = 'none';
                    overlay.addEventListener('animationend', function onHideAnim() {
                        overlay.removeEventListener('animationend', onHideAnim);
                        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    }, { once: true }); // Added { once: true } for safety
                    sendMessageToParent({ type: 'description-state', open: false });
                } else {
                    overlay.classList.remove('hide-anim');
                    overlay.classList.add('show');
                    overlay.style.pointerEvents = 'auto';
                    sendMessageToParent({ type: 'description-state', open: true });
                }
            }
        }
    }

    // --- CLEANED UP NAVIGATION LOGIC ---
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
    // animate: boolean, whether to use animations (typically true for navigation).
    // skipFadeIn: boolean, for mobile swipe, uses a slide transition instead of fade for new media.
    function openLightboxByIndex(index, direction = 0, skipFadeIn = false) {
        if (index < 0) index = allPosts.length - 1;
        if (index >= allPosts.length) index = 0;
        const post = allPosts[index];
        if (!post) return;
        currentLightboxIndex = index; // Update the global index

        // Extract data from the post element
        const type = post.dataset.type;
        const src = post.dataset.src;
        const title = post.dataset.title;
        const subheading = post.dataset.subheading;
        const desktopDescription = post.dataset.description;
        const mobileDescription = post.dataset.mobileDescription;
        const linkType = post.dataset.linkType; // Get the link type
        const linkUrl = post.dataset.linkUrl;   // Get the link URL

        // Always use a persistent wrapper for lightbox media and description
        const wrapper = getOrCreateWrapper();

        // --- Animation Coordination for Content Swap ---
        // Flags to track if old media and description card have finished their exit animations.
        const oldMedia = wrapper.querySelector('img, video');
        const oldAnimWrapper = wrapper.querySelector('.desc-card-anim-wrapper');
        const oldDescCard = oldAnimWrapper ? oldAnimWrapper.querySelector('.lightbox-desc-card') : null;
        let mediaFaded = !oldMedia; // True if no old media to animate out
        let descCardFadedOut = !oldDescCard; // True if no old description card to animate out

        // This function is called after old media or old description card finishes animating out.
        // It checks if *both* are done before proceeding to swap in the new content.
        function trySwapInNewContent() {
            if (mediaFaded && descCardFadedOut) { // Only proceed if both exit animations are complete
                while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild); // Clear previous content

                // Remove old media type classes and add new one before appending media
                wrapper.classList.remove('image-media-active', 'video-media-active');
                if (type === 'video') {
                    wrapper.classList.add('video-media-active');
                } else if (type === 'image') {
                    wrapper.classList.add('image-media-active');
                }

                // --- Insert new media (image or video) ---
                let newMedia = createLightboxMediaElement(type, src);

                if (newMedia) {
                    // Original condition for media animation
                    if (!(skipFadeIn && !isDesktop())) {
                        // Standard fade-in for new media
                        newMedia.style.opacity = '0';
                        newMedia.style.transition = 'opacity 220ms cubic-bezier(0.4,0,0.2,1)';
                        wrapper.appendChild(newMedia); 
                        setTimeout(() => { newMedia.style.opacity = '1'; }, 10); // Slight delay to ensure transition applies
                    } else {
                        // Slide-in animation for new media (used for mobile swipe navigation)
                        const slideFrom = direction === 1 ? '100vw' : direction === -1 ? '-100vw' : '100vw';
                        newMedia.style.transform = `translateX(${slideFrom})`;
                        newMedia.style.transition = 'transform 400ms cubic-bezier(0.4,0,0.2,1)';
                        wrapper.appendChild(newMedia); 
                        void newMedia.offsetWidth; // Force reflow
                        setTimeout(() => { newMedia.style.transform = 'translateX(0)'; }, 10);
                    }
                }

                // --- Insert new description card for desktop ---
                if (isDesktop()) {
                    // If the description was visible, remove the class to reset its animation state, then re-add.
                    if (wrapper.classList.contains('desc-visible')) {
                        wrapper.classList.remove('desc-visible');
                        void wrapper.offsetHeight; // Force reflow
                    }

                    const newAnimWrapper = createDesktopDescriptionCard(title, subheading, desktopDescription);
                    wrapper.appendChild(newAnimWrapper);
                    
                    void newAnimWrapper.offsetHeight; // Ensure this line is present
                    wrapper.classList.add('desc-visible');
                }
                
                // --- Update non-animated details in #lightbox-details (title, subheading) ---
                updateLightboxDetails(title, subheading, isDesktop() ? null : (mobileDescription || desktopDescription));

                sendMessageToParent({ type: 'description-state', open: isDesktop() });
                // Send lightbox state including link type and URL
                sendMessageToParent({ 
                    type: 'lightbox-state', 
                    open: true, 
                    linkType: linkType || null, 
                    linkUrl: linkUrl || null    
                });
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
            oldAnimWrapper.style.transition = 'width 0.4s cubic-bezier(0.4,0,0.2,1)';
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
            }, 450); 
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

    // Applies transform to the lightbox content for swipe effect.
    // dx, dy: horizontal and vertical translation.
    // scale: content scaling (used for vertical swipe-to-close).
    function setSwipeContentTransform(dx, dy, scale = 1) {
        if (lightboxContent) {
            lightboxContent.style.transform = `translateX(${dx}px) translateY(${dy}px) scale(${scale})`;
            const media = lightboxContent.querySelector('img, video');
            if (media && dragIsVertical) { // Vertical drag for closing
                // Calculate fade and scale based on vertical drag distance
                const fadeEnd = 0.95; // Point at which fade completes
                const dragRatio = Math.min(1, Math.abs(dy) / (window.innerHeight * fadeEnd));
                const fade = 1 - Math.pow(dragRatio, 2); // Non-linear fade
                media.style.opacity = fade;
                lightbox.style.opacity = fade; // Fade lightbox background as well
                
                const minScale = 0.25; // Minimum scale before close
                const scaleVal = 1 - (1 - minScale) * dragRatio; // Scale down media
                lightboxContent.style.transform = `translateX(${dx}px) translateY(${dy}px) scale(${scaleVal})`;
            } else if (media) { // Horizontal drag for navigation
                media.style.opacity = ''; // Reset media opacity
                lightboxContent.style.transform = `translateX(${dx}px) translateY(${dy}px) scale(1)`;
                lightbox.style.opacity = ''; // Reset lightbox opacity
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

    // Touch Start: Initialize drag variables
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
                lightboxContent.classList.add('swiping'); // Indicate swiping state (e.g., for disabling transitions)
                lightboxContent.classList.remove('animate'); // Remove class that enables snap-back/swipe-away transitions
            }
        }
    }

    // Touch Move: Update content position based on drag
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

    // Touch End: Determine action (swipe next/prev, swipe close, or snap back)
    function handleTouchEnd() {
        if (!dragging) return;
        dragging = false;
        if (dragRAF) cancelAnimationFrame(dragRAF); // Cancel any pending animation frame

        const dx = dragCurrentX - dragStartX;
        const dy = dragCurrentY - dragStartY;
        const media = lightboxContent.querySelector('img, video');

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
            if (dragIsVertical && draggedBottom < window.innerHeight / 2 && Math.abs(dy) > Math.abs(dx)) {
                triggerSwipeUp = true;
            }
            // Swipe Left (Next): If media's right edge is left of horizontal center (and horizontal drag)
            if (!dragIsVertical && draggedRight < window.innerWidth / 2 && dx < 0 && Math.abs(dx) > Math.abs(dy)) {
                triggerSwipeLeft = true;
            }
            // Swipe Right (Previous): If media's left edge is right of horizontal center (and horizontal drag)
            if (!dragIsVertical && draggedLeft > window.innerWidth / 2 && dx > 0 && Math.abs(dx) > Math.abs(dy)) {
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
        }
    }

    // Attach touch listeners to the lightboxContent
    if (lightboxContent) {
        lightboxContent.addEventListener('touchstart', handleTouchStart, { passive: true });
        lightboxContent.addEventListener('touchmove', handleTouchMove, { passive: true });
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
                // Layout is ready, notify parent
                setTimeout(() => {
                  sendMessageToParent({ type: 'projects-ready' });
                }, 0);
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
        // Only play the first 2 visible, pause the rest
        visibleVideos.slice(0, 2).forEach(video => video.play());
        visibleVideos.slice(2).forEach(video => video.pause());
        // Pause all non-visible
        gridVideos.filter(video => !video.__isIntersecting).forEach(video => video.pause());
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
            }
            // Keep existing toolbar-action handling
            if (event.data.type === 'toolbar-action') {
                if (event.data.action === 'viewDescription') {
                    const wrapper = lightboxContent.querySelector('.lightbox-media-wrapper');
                    let description = '';
                    if (currentLightboxIndex !== null && allPosts[currentLightboxIndex]) {
                        // If on mobile, prefer mobileDescription, fallback to desktopDescription
                        // If on desktop, always use desktopDescription for the animated card
                        if (!isDesktop() && allPosts[currentLightboxIndex].dataset.mobileDescription) {
                            description = allPosts[currentLightboxIndex].dataset.mobileDescription;
                        } else {
                            description = allPosts[currentLightboxIndex].dataset.description;
                        }
                    }
                    toggleLightboxOverlay(description, wrapper);
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
});
