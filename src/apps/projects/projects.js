// JavaScript for Projects App Lightbox

document.addEventListener('DOMContentLoaded', () => {
    const lightbox = document.getElementById('project-lightbox');
    const lightboxContent = document.getElementById('lightbox-content');
    const lightboxDetails = document.getElementById('lightbox-details');
    const posts = document.querySelectorAll('.post');
    const feedContainer = document.querySelector('.feed-container');

    if (!lightbox || !lightboxContent || !lightboxDetails || !feedContainer) {
        console.error('Lightbox, feedContainer, or critical elements not found, or no posts available.');
        return;
    }

    // Utility to get the Home button in the current window's toolbar
    function getHomeButton() {
        return document.querySelector('.toolbar-button.home');
    }

    function setHomeButtonEnabled(enabled) {
        const homeButton = getHomeButton();
        if (homeButton) {
            if (enabled) {
                homeButton.classList.remove('disabled');
            } else {
                homeButton.classList.add('disabled');
            }
        }
    }

    function setHomeButtonEnabledInParent(enabled) {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(
                { type: 'set-home-enabled', enabled },
                '*'
            );
        }
    }

    /**
     * Opens the lightbox with the specified media type and source.
     * @param {string} type - The type of media to display (image, video).
     * @param {string} src - The source URL of the media.
     * @param {string} titleText - The title text to display.
     * @param {string} subheadingText - The subheading text to display.
     * @param {string} desktopDescriptionText - The description text for desktop.
     * @param {string} mobileDescriptionText - The description text for mobile.
     */
    function openLightbox(type, src, titleText, subheadingText, desktopDescriptionText, mobileDescriptionText, fadeInFast) {
        console.log('OPENLIGHTBOX CALLED', {type, src, titleText, subheadingText, desktopDescriptionText, mobileDescriptionText, fadeInFast});
        // Pause all grid videos
        document.querySelectorAll('.feed-container video').forEach(v => { v.pause(); });

        // Add or remove image-lightbox class based on type
        if (type === 'image') {
            lightbox.classList.add('image-lightbox');
        } else {
            lightbox.classList.remove('image-lightbox');
        }

        lightboxContent.innerHTML = '';
        const existingTitle = lightboxDetails.querySelector('#lightbox-title');
        if (existingTitle) {
            lightboxDetails.removeChild(existingTitle);
        }
        const existingSubheading = lightboxDetails.querySelector('#lightbox-subheading');
        if (existingSubheading) {
            lightboxDetails.removeChild(existingSubheading);
        }
        const existingDescription = lightboxDetails.querySelector('#lightbox-description');
        if (existingDescription) {
            lightboxDetails.removeChild(existingDescription);
        }

        let mediaElement;

        if (type === 'image') {
            mediaElement = document.createElement('img');
            mediaElement.src = src;
            mediaElement.alt = 'Project Lightbox Image';
            // Hide image until loaded
            mediaElement.style.opacity = '0';
            const showImage = () => {
                mediaElement.style.opacity = '';
            };
            mediaElement.addEventListener('load', showImage, { once: true });
            // Fallback: show after 500ms if load is slow
            setTimeout(() => {
                mediaElement.style.opacity = '';
            }, 500);
        } else if (type === 'video') {
            mediaElement = document.createElement('video');
            mediaElement.src = src;
            mediaElement.controls = true;
            mediaElement.autoplay = true;
            mediaElement.loop = true;
            mediaElement.alt = 'Project Lightbox Video';
            mediaElement.setAttribute('playsinline', '');
            // Hide video until ready
            mediaElement.style.opacity = '0';
            // Fade in video when ready
            const showVideo = () => {
                mediaElement.style.opacity = '';
            };
            mediaElement.addEventListener('loadeddata', showVideo, { once: true });
            // Fallback: show after 700ms if loadeddata is slow
            setTimeout(() => {
                mediaElement.style.opacity = '';
            }, 700);
        }

        if (mediaElement) {
            // Ensure any existing content in lightboxContent is cleared before new setup
            lightboxContent.innerHTML = ''; 

            const wrapper = document.createElement('div');
            wrapper.className = 'lightbox-media-wrapper';
            // The media element (image or video) goes directly into this main wrapper
            wrapper.appendChild(mediaElement);
            
            // Desktop: add .desc-card-anim-wrapper -> .lightbox-desc-card -> .desc-card-inner-border-container -> .desc-card-content
            if (isDesktop()) {
                const animWrapper = document.createElement('div');
                animWrapper.className = 'desc-card-anim-wrapper';

                const descCard = document.createElement('div');
                descCard.className = 'lightbox-desc-card';

                const descContent = document.createElement('div');
                descContent.className = 'desc-card-content desc-content-visible'; // Assuming content is visible if card is
                descContent.textContent = desktopDescriptionText || ''; 

                descCard.appendChild(descContent);
                animWrapper.appendChild(descCard);
                wrapper.appendChild(animWrapper); // Append the whole description structure next to the media

                // Force reflow before adding .desc-visible to ensure transitions fire
                void animWrapper.offsetHeight;
                wrapper.classList.add('desc-visible');

                // Optional: If .show class is used for any final static styling on descCard after animation
                // descCard.classList.add('show'); 
                // descContent.classList.add('desc-content-visible'); // Already added, but confirm if needed separately

                setDescCardHeight(wrapper); // This function might need to be aware of the new structure if it relies on card's direct children
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: 'description-state', open: true }, '*');
                }
            }
            lightboxContent.appendChild(wrapper); // Append the main wrapper (media + desc structure) to the lightbox
        }

        // Update non-animated details in #lightbox-details (title, subheading, etc.)
        // This part remains the same, it populates a separate area of the lightbox.
        if (titleText) {
            const titleElement = document.createElement('div');
            titleElement.id = 'lightbox-title';
            titleElement.textContent = titleText;
            if (lightboxDetails) {
                lightboxDetails.appendChild(titleElement);
            }
        }

        if (subheadingText) {
            const subheadingElement = document.createElement('div');
            subheadingElement.id = 'lightbox-subheading';
            subheadingElement.textContent = subheadingText;
            const titleEl = lightboxDetails.querySelector('#lightbox-title');
            if (titleEl && titleEl.nextSibling) {
                lightboxDetails.insertBefore(subheadingElement, titleEl.nextSibling);
            } else if (lightboxDetails) {
                lightboxDetails.appendChild(subheadingElement);
            }
        }

        if (desktopDescriptionText && lightboxDetails) { 
            // This is the separate, non-animated description area. 
            // We still populate it as it might be used by CSS for a different display / non-desktop.
            const descriptionElement = document.createElement('div');
            descriptionElement.id = 'lightbox-description';
            descriptionElement.textContent = desktopDescriptionText;
            const subheadingEl = lightboxDetails.querySelector('#lightbox-subheading');
            const titleEl = lightboxDetails.querySelector('#lightbox-title');
            if (subheadingEl && subheadingEl.nextSibling) {
                 lightboxDetails.insertBefore(descriptionElement, subheadingEl.nextSibling);
            } else if (titleEl && titleEl.nextSibling) {
                 lightboxDetails.insertBefore(descriptionElement, titleEl.nextSibling);
            } else if (lightboxDetails) {
                lightboxDetails.appendChild(descriptionElement);
            }
        }

        // --- Fade-in logic for the lightbox itself ---
        lightbox.style.display = 'flex';
        lightbox.classList.remove('fade-out');
        // Force reflow to ensure transition
        void lightbox.offsetWidth;
        requestAnimationFrame(() => {
            lightbox.classList.add('fade-in');
        });
        document.body.style.overflow = 'hidden';

        // When opening, always reset visibility
        lightbox.style.visibility = '';
        setHomeButtonEnabledInParent(true);

        // If fadeInFast is true (desktop button nav), use a fast fade-in
        if (fadeInFast && isDesktop() && lightboxContent) {
            const media = lightboxContent.querySelector('img, video');
            if (media) {
                media.style.transition = 'opacity 120ms cubic-bezier(0.4,0,0.2,1)';
                media.style.opacity = '0';
                setTimeout(() => {
                    media.style.opacity = '1';
                }, 10);
            }
        }

        // Notify parent that lightbox is open (enable back/forward/desc)
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'lightbox-state', open: true }, '*');
        }
    }

    /**
     * Closes the lightbox.
     */
    function closeLightbox() {
        // Fade out the lightbox background before hiding
        lightbox.classList.remove('fade-in');
        lightbox.classList.add('fade-out');
        let transitionEnded = false;
        const onTransitionEnd = (e) => {
            if (e.target === lightbox && e.propertyName === 'opacity') {
                transitionEnded = true;
                lightbox.style.display = 'none';
                lightbox.classList.remove('fade-out');
                lightbox.removeEventListener('transitionend', onTransitionEnd);
                // Extra: Hide and reset to prevent post-close flashes
                lightbox.style.visibility = 'hidden';
                lightbox.style.opacity = '';
                if (lightboxContent) lightboxContent.style.opacity = '';
            }
        };
        lightbox.addEventListener('transitionend', onTransitionEnd);
        // Fallback: If transitionend doesn't fire (e.g. swipe close on mobile), hide after 300ms
        setTimeout(() => {
            if (!transitionEnded && lightbox.classList.contains('fade-out')) {
                lightbox.style.display = 'none';
                lightbox.classList.remove('fade-out');
                lightbox.removeEventListener('transitionend', onTransitionEnd);
                // Extra: Hide and reset to prevent post-close flashes
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
        lightboxContent.innerHTML = '';
        const titleElement = document.getElementById('lightbox-title');
        if (titleElement) {
            titleElement.remove();
        }
        const subheadingElement = document.getElementById('lightbox-subheading');
        if (subheadingElement) {
            subheadingElement.remove();
        }
        const descriptionElement = document.getElementById('lightbox-description');
        if (descriptionElement) {
            descriptionElement.remove();
        }
        // Resume correct grid video state after closing lightbox
        if (typeof isMaximized !== 'undefined' && isMaximized) {
            gridVideos.forEach(v => v.pause());
        } else if (typeof playVisibleVideos === 'function' && intersectionObserver) {
            playVisibleVideos();
        }
        document.body.style.overflow = '';
        setHomeButtonEnabledInParent(false);

        // Notify parent that lightbox is closed (disable back/forward/desc)
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'lightbox-state', open: false }, '*');
        }
    }

    // --- Desktop Lightbox Navigation Buttons & Hint ---
    const desktopHint = document.getElementById('lightbox-desktop-hint');
    let desktopHintShown = false;

    function isDesktop() {
        return window.matchMedia('(min-width: 768px)').matches;
    }

    function showDesktopHint() {
        if (!isDesktop() || !desktopHint || desktopHintShown) return;
        desktopHint.style.display = 'block';
        setTimeout(() => {
            desktopHint.style.opacity = '0';
            setTimeout(() => {
                desktopHint.style.display = 'none';
                desktopHint.style.opacity = '';
            }, 600);
        }, 3200);
        desktopHintShown = true;
    }

    // Show hint when lightbox opens (desktop only)
    const origOpenLightbox = openLightbox;
    openLightbox = function(...args) {
        origOpenLightbox.apply(this, args);
        if (isDesktop()) {
            showDesktopHint();
        }
    };

    // --- Lightbox Description Overlay ---
    function createLightboxOverlay(description) {
        const overlay = document.createElement('div');
        overlay.className = 'lightbox-caption-overlay';
        overlay.textContent = description || '';
        overlay.style.pointerEvents = 'none'; // Always non-blocking by default
        return overlay;
    }

    let lightboxOverlayVisible = false;

    function setDescCardHeight(wrapper) {
        if (!wrapper) return;
        const card = wrapper.querySelector('.lightbox-desc-card');
        if (card) {
            // Rely on CSS (height: 100% on card and align-items: stretch on wrapper)
            // No explicit height setting here.
        }
    }

    function clearDescCardHeight(wrapper) {
        if (!wrapper) return;
        const card = wrapper.querySelector('.lightbox-desc-card');
        if (card) {
            // No explicit height to clear if we are relying on CSS height: 100%
            // card.style.height = ''; 
        }
    }

    function toggleLightboxOverlay(description, wrapper) {
        if (!wrapper) return;
        if (isDesktop()) {
            // For desktop, visibility is controlled by .desc-visible on the wrapper.
            // The CSS transitions on .desc-card-anim-wrapper (width) and .lightbox-desc-card (opacity/transform)
            // are scoped under .lightbox-media-wrapper.desc-visible.

            const isCurrentlyVisible = wrapper.classList.contains('desc-visible');

            if (isCurrentlyVisible) { // HIDING LOGIC
                console.log('[Toggle Desktop] Hiding: .desc-visible is on wrapper. Removing it.');
                wrapper.classList.remove('desc-visible');
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: 'description-state', open: false }, '*');
                }
            } else { // SHOWING LOGIC
                console.log('[Toggle Desktop] Showing: .desc-visible is NOT on wrapper. Adding it.');
                const animWrapper = wrapper.querySelector('.desc-card-anim-wrapper');
                let card = animWrapper ? animWrapper.querySelector('.lightbox-desc-card') : null;
                let contentElement = card ? card.querySelector('.desc-card-content') : null;

                // Ensure the full structure exists if it was not there or got cleared
                if (!animWrapper) {
                    // This case should ideally be less common if openLightboxByIndex always creates it for desktop
                    console.warn('[Toggle Desktop] animWrapper not found, creating full structure.');
                    const newAnimWrapper = document.createElement('div');
                    newAnimWrapper.className = 'desc-card-anim-wrapper';
                    card = document.createElement('div');
                    card.className = 'lightbox-desc-card';
                    contentElement = document.createElement('div');
                    contentElement.className = 'desc-card-content desc-content-visible';
                    
                    card.appendChild(contentElement);
                    newAnimWrapper.appendChild(card);
                    wrapper.appendChild(newAnimWrapper); // Append to the main media wrapper
                }
                if (!card && animWrapper) { // animWrapper exists, but card doesn't (unlikely state)
                    card = document.createElement('div');
                    card.className = 'lightbox-desc-card';
                    animWrapper.appendChild(card);
                }
                if (!contentElement && card) {
                    contentElement = document.createElement('div');
                    contentElement.className = 'desc-card-content desc-content-visible';
                    card.appendChild(contentElement);
                }

                if (contentElement && description) {
                    contentElement.textContent = description;
                } else if (contentElement) {
                    contentElement.textContent = ''; // Clear if no description
                }
                
                wrapper.classList.add('desc-visible');
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: 'description-state', open: true }, '*');
                }
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
                lightboxOverlayVisible = true;
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: 'description-state', open: true }, '*');
                }
            } else {
                if (overlay.classList.contains('show')) {
                    overlay.classList.remove('show');
                    overlay.classList.add('hide-anim');
                    overlay.style.pointerEvents = 'none';
                    lightboxOverlayVisible = false;
                    overlay.addEventListener('animationend', function onHideAnim() {
                        overlay.removeEventListener('animationend', onHideAnim);
                        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    }, { once: true }); // Added { once: true } for safety
                    if (window.parent && window.parent !== window) {
                        window.parent.postMessage({ type: 'description-state', open: false }, '*');
                    }
                } else {
                    overlay.classList.remove('hide-anim');
                    overlay.classList.add('show');
                    overlay.style.pointerEvents = 'auto';
                    lightboxOverlayVisible = true;
                    if (window.parent && window.parent !== window) {
                        window.parent.postMessage({ type: 'description-state', open: true }, '*');
                    }
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
            wrapper.style.maxWidth = '90vw';
            wrapper.style.width = '100%';
            wrapper.style.minWidth = '0';
            wrapper.style.overflow = 'hidden';
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'stretch';
            wrapper.style.justifyContent = 'center';
            lightboxContent.appendChild(wrapper);
        }
        return wrapper;
    }

    function openLightboxByIndex(index, direction = 0, animate = true, fadeInFast = false, skipFadeIn = false) {
        if (index < 0) index = allPosts.length - 1;
        if (index >= allPosts.length) index = 0;
        const post = allPosts[index];
        if (!post) return;
        currentLightboxIndex = index;
                    const type = post.dataset.type;
                    const src = post.dataset.src;
        const title = post.dataset.title;
        const subheading = post.dataset.subheading;
        const desktopDescription = post.dataset.description;
        const mobileDescription = post.dataset.mobileDescription;

        // Always use a persistent wrapper
        const wrapper = getOrCreateWrapper();

        // Animate out old children (media, desc card)
        const oldMedia = wrapper.querySelector('img, video');
        const oldAnimWrapper = wrapper.querySelector('.desc-card-anim-wrapper');
        const oldDescCard = oldAnimWrapper ? oldAnimWrapper.querySelector('.lightbox-desc-card') : null;
        let mediaFaded = !oldMedia;
        let descCardFadedOut = !oldDescCard;

        function trySwapInNewContent() {
            console.log('[Nav In] trySwapInNewContent called. mediaFaded:', mediaFaded, 'descCardFadedOut:', descCardFadedOut);
            if (mediaFaded && descCardFadedOut) {
                console.log('[Nav In] Conditions met, swapping content.');
                while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

                // --- Insert new media ---
                let newMedia;
                if (type === 'image') {
                    newMedia = document.createElement('img');
                    newMedia.src = src;
                    newMedia.alt = 'Project Lightbox Image';
                } else if (type === 'video') {
                    newMedia = document.createElement('video');
                    newMedia.src = src;
                    newMedia.controls = true;
                    newMedia.autoplay = true;
                    newMedia.loop = true;
                    newMedia.alt = 'Project Lightbox Video';
                    newMedia.setAttribute('playsinline', '');
                }
                if (newMedia) {
                    if (!(skipFadeIn && !isDesktop())) {
                        newMedia.style.opacity = '0';
                        newMedia.style.transition = 'opacity 220ms cubic-bezier(0.4,0,0.2,1)';
                        wrapper.appendChild(newMedia); 
                        setTimeout(() => { newMedia.style.opacity = '1'; }, 10);
                    } else {
                        const slideFrom = direction === 1 ? '100vw' : direction === -1 ? '-100vw' : '100vw';
                        newMedia.style.transform = `translateX(${slideFrom})`;
                        newMedia.style.transition = 'transform 400ms cubic-bezier(0.4,0,0.2,1)';
                        wrapper.appendChild(newMedia); 
                        void newMedia.offsetWidth;
                        setTimeout(() => { newMedia.style.transform = 'translateX(0)'; }, 10);
                    }
                }

                if (isDesktop()) {
                    if (wrapper.classList.contains('desc-visible')) {
                        wrapper.classList.remove('desc-visible');
                        void wrapper.offsetHeight;
                        console.log('[Nav In] Temporarily REMOVED .desc-visible from wrapper for reset.');
                    }

                    const newAnimWrapper = document.createElement('div');
                    newAnimWrapper.className = 'desc-card-anim-wrapper';
                    
                    const newDescCard = document.createElement('div');
                    newDescCard.className = 'lightbox-desc-card';
                    
                    // Create the new inner border container
                    const newDescContent = document.createElement('div');
                    newDescContent.className = 'desc-card-content desc-content-visible';
                    newDescContent.textContent = desktopDescription || ''; 
                    
                    // Nest content -> newDescCard -> newAnimWrapper
                    newDescCard.appendChild(newDescContent);
                    newAnimWrapper.appendChild(newDescCard);
                    wrapper.appendChild(newAnimWrapper);
                    console.log('[Nav In] New anim wrapper, card, and content added to DOM. Wrapper element:', wrapper);

                    void newAnimWrapper.offsetHeight;
                    console.log('[Nav In] Reflow forced for newAnimWrapper.');

                    wrapper.classList.add('desc-visible');
                    console.log('[Nav In] RE-ADDED .desc-visible to wrapper. Current classes on wrapper:', wrapper.classList);
                }
                
                // --- Update non-animated details in #lightbox-details ---
                // (Your existing logic for #lightbox-title, #lightbox-subheading, #lightbox-description)
                const removeIfExists = id => {
                    const el = lightboxDetails.querySelector(id);
                    if (el) el.remove();
                };
                removeIfExists('#lightbox-title');
                removeIfExists('#lightbox-subheading');
                removeIfExists('#lightbox-description');
                if (title) {
                    const titleElement = document.createElement('div');
                    titleElement.id = 'lightbox-title';
                    titleElement.textContent = title;
                    lightboxDetails.appendChild(titleElement);
                }
                if (subheading) {
                    const subheadingElement = document.createElement('div');
                    subheadingElement.id = 'lightbox-subheading';
                    subheadingElement.textContent = subheading;
                    const titleEl = lightboxDetails.querySelector('#lightbox-title');
                    if (titleEl && titleEl.nextSibling) {
                        lightboxDetails.insertBefore(subheadingElement, titleEl.nextSibling);
                    } else {
                        lightboxDetails.appendChild(subheadingElement);
                    }
                }
                if (desktopDescription) {
                    const descriptionElement = document.createElement('div');
                    descriptionElement.id = 'lightbox-description';
                    descriptionElement.textContent = desktopDescription;
                    const subheadingEl = lightboxDetails.querySelector('#lightbox-subheading');
                    const titleEl = lightboxDetails.querySelector('#lightbox-title');
                    if (subheadingEl && subheadingEl.nextSibling) {
                        lightboxDetails.insertBefore(descriptionElement, subheadingEl.nextSibling);
                    } else if (titleEl && titleEl.nextSibling) {
                        lightboxDetails.insertBefore(descriptionElement, titleEl.nextSibling);
                    } else {
                        lightboxDetails.appendChild(descriptionElement);
                    }
                }

                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: 'description-state', open: isDesktop() }, '*');
                }
            }
        }

        // Animate out old media
            if (oldMedia) {
            if (!(skipFadeIn && !isDesktop())) {
                oldMedia.style.transition = 'opacity 180ms cubic-bezier(0.4,0,0.2,1)';
                oldMedia.style.opacity = '0';
                let handled = false;
                function onFade(e) {
                    if (handled) return;
                    if (e && (e.target !== oldMedia || e.propertyName !== 'opacity')) return;
                    handled = true;
                    oldMedia.removeEventListener('transitionend', onFade);
                    mediaFaded = true;
                    trySwapInNewContent();
                }
                oldMedia.addEventListener('transitionend', onFade);
                setTimeout(() => { if (!handled) { onFade(); } }, 250);
            } else {
                // On mobile swipe, remove instantly (no fade)
                oldMedia.remove();
                mediaFaded = true;
                trySwapInNewContent();
            }
            } else {
            mediaFaded = true;
        }
        // Animate out old desc card
        if (oldAnimWrapper) {
            console.log('[Nav Out] Initiating slide-out for oldAnimWrapper:', oldAnimWrapper);
            // Ensure CSS transitions are active for opacity/transform on the card itself
            if (oldDescCard) {
                oldDescCard.style.opacity = '0';
                oldDescCard.style.transform = 'translateX(-40px)';
                console.log('[Nav Out] Set opacity/transform on oldDescCard:', oldDescCard);
            }
            // Set transition explicitly for the wrapper's width
            oldAnimWrapper.style.transition = 'width 0.4s cubic-bezier(0.4,0,0.2,1)';
            oldAnimWrapper.style.width = '0px'; // Trigger width transition
            console.log('[Nav Out] Set width to 0px on oldAnimWrapper.');
            let handled = false;
            const onOldWrapperTransitionEnd = (e) => {
                if (handled || (e && (e.target !== oldAnimWrapper || e.propertyName !== 'width'))) {
                    return; // Ignore if already handled or not the width transition we care about
                }
                handled = true;
                console.log('[Nav Out] oldAnimWrapper transitionend FIRED for width:', e);
                oldAnimWrapper.removeEventListener('transitionend', onOldWrapperTransitionEnd);
                if (oldAnimWrapper.parentNode) {
                    oldAnimWrapper.remove();
                    console.log('[Nav Out] oldAnimWrapper removed from DOM (transitionend).');
                }
                descCardFadedOut = true;
                console.log('[Nav Out] descCardFadedOut set to true (transitionend).');
                trySwapInNewContent();
            };
            oldAnimWrapper.addEventListener('transitionend', onOldWrapperTransitionEnd);
            // Fallback timeout in case transitionend doesn't fire
            setTimeout(() => {
                if (!handled) {
                    console.warn('[Nav Out] Fallback: Old anim wrapper transitionend did NOT fire in time.');
                    handled = true; // Prevent transitionend from doing double work if it fires late
                    oldAnimWrapper.removeEventListener('transitionend', onOldWrapperTransitionEnd); // Cleanup listener
                    if (oldAnimWrapper.parentNode) {
                        oldAnimWrapper.remove();
                        console.warn('[Nav Out] oldAnimWrapper removed from DOM (fallback).');
                    }
                    descCardFadedOut = true;
                    console.warn('[Nav Out] descCardFadedOut set to true (fallback).');
                    trySwapInNewContent();
                }
            }, 450); // Slightly longer than the 400ms transition
        } else {
            console.log('[Nav Out] No oldAnimWrapper to slide out.');
            descCardFadedOut = true; // No card to animate out
        }
        trySwapInNewContent();
    }

    // Modify the post click handler to only open the lightbox
    posts.forEach((post, idx) => {
        post.addEventListener('click', (event) => {
            if (event.target.tagName === 'A') {
                return;
            }
            currentLightboxIndex = idx;
            const type = post.dataset.type;
            const title = post.dataset.title;
            const subheading = post.dataset.subheading;
            const desktopDescription = post.dataset.description;
            const mobileDescription = post.dataset.mobileDescription;
            const sourceData = post.dataset.src;
            if (type && sourceData) {
                openLightbox(type, sourceData, title, subheading, desktopDescription, mobileDescription);
            }
        });
    });

    // Hide overlays when clicking outside any post
    window.addEventListener('click', (event) => {
        if (!event.target.closest('.post')) {
            posts.forEach(p => p.classList.remove('show-caption'));
        }
    });

    // --- Smooth Drag/Swipe Logic ---
    function setSwipeContentTransform(dx, dy, scale = 1) {
        if (lightboxContent) {
            lightboxContent.style.transform = `translateX(${dx}px) translateY(${dy}px) scale(${scale})`;
            const media = lightboxContent.querySelector('img, video');
            if (media && dragIsVertical) {
                // Calculate fade and scale based on vertical drag
                const fadeEnd = 0.95;
                const dragRatio = Math.min(1, Math.abs(dy) / (window.innerHeight * fadeEnd));
                const fade = 1 - Math.pow(dragRatio, 2);
                media.style.opacity = fade;
                // Fade out the lightbox background (not background-color, but opacity)
                lightbox.style.opacity = fade;
                // Scale from 1 to 0.25 as drag progresses
                const minScale = 0.25;
                const scaleVal = 1 - (1 - minScale) * dragRatio;
                lightboxContent.style.transform = `translateX(${dx}px) translateY(${dy}px) scale(${scaleVal})`;
            } else if (media) {
                media.style.opacity = '';
                lightboxContent.style.transform = `translateX(${dx}px) translateY(${dy}px) scale(1)`;
                // Reset lightbox opacity if not swiping up
                lightbox.style.opacity = '';
            }
        }
    }

    let dragStartX = 0;
    let dragCurrentX = 0;
    let dragStartY = 0;
    let dragCurrentY = 0;
    let dragging = false;
    let dragThreshold = 60; // px
    let dragHasMoved = false;
    let verticalDragThreshold = 60; // px for swipe up to close
    let lastDragDx = 0;
    let lastDragDy = 0;
    let dragRAF = null;
    let dragIsVertical = false;

    function handleTouchStart(e) {
        if (e.touches.length === 1) {
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
            }
        }
    }

    function handleTouchMove(e) {
        if (!dragging || e.touches.length !== 1) return;
        dragCurrentX = e.touches[0].clientX;
        dragCurrentY = e.touches[0].clientY;
        const dx = dragCurrentX - dragStartX;
        const dy = dragCurrentY - dragStartY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragHasMoved = true;
        if (!dragIsVertical && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
            dragIsVertical = true;
        } else if (!dragIsVertical && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
            dragIsVertical = false;
        }
        if (lightboxContent && !dragIsVertical) {
            setSwipeContentTransform(dx, 0, 1);
        }
        if (lightboxContent && dragIsVertical) {
            const limitedDy = Math.min(0, dy);
            const minScale = 0.85;
            const scaleVal = 1 + (minScale - 1) * Math.min(1, Math.abs(limitedDy) / (window.innerHeight / 2));
            lastDragDx = 0;
            lastDragDy = limitedDy;
            if (dragRAF) cancelAnimationFrame(dragRAF);
            dragRAF = requestAnimationFrame(() => {
                setSwipeContentTransform(0, limitedDy, scaleVal);
                // Do NOT change lightbox bg opacity here
            });
        }
    }

    function fadeInNewPost() {
        if (!lightboxContent) return;
        const media = lightboxContent.querySelector('img, video');
        if (media) {
            const performFadeIn = () => {
                media.style.opacity = '0'; // Ensure it starts transparent before fade
            media.style.transition = 'opacity 220ms cubic-bezier(0.4,0,0.2,1)';
                // Brief timeout to allow the opacity: 0 to apply before transitioning to opacity: 1
            setTimeout(() => {
                media.style.opacity = '1';
                }, 20); // Small delay like 20ms is often enough
            };

            // Clear previous listeners if any (though `once: true` should handle it)
            media.removeEventListener('load', performFadeIn);
            media.removeEventListener('loadeddata', performFadeIn);

            if (media.tagName === 'IMG') {
                if (media.complete) { // If image is already loaded (e.g., from cache)
                    performFadeIn();
                } else {
                    media.addEventListener('load', performFadeIn, { once: true });
                }
            } else if (media.tagName === 'VIDEO') {
                if (media.readyState >= 3) { // HAVE_FUTURE_DATA or more, enough to play
                    performFadeIn();
                } else {
                    media.addEventListener('loadeddata', performFadeIn, { once: true });
                }
            }

            // Fallback: If load events are slow or don't fire, still show the media after a delay
            setTimeout(() => {
                if (media.style.opacity !== '1') { // Check if already faded in
                    // console.warn('Fallback: Fading in media due to timeout.');
                    performFadeIn(); 
                }
            }, 500); // 500ms fallback
        }
    }

    function handleTouchEnd() {
        if (!dragging) return;
        dragging = false;
        if (dragRAF) cancelAnimationFrame(dragRAF);
        const dx = dragCurrentX - dragStartX;
        const dy = dragCurrentY - dragStartY;
        const media = lightboxContent.querySelector('img, video');
        let triggerSwipeUp = false;
        let triggerSwipeLeft = false;
        let triggerSwipeRight = false;
        if (media) {
            const rect = media.getBoundingClientRect();
            // Calculate where the media would be after the drag
            const draggedTop = rect.top + dy;
            const draggedBottom = rect.bottom + dy;
            const draggedLeft = rect.left + dx;
            const draggedRight = rect.right + dx;
            const draggedCenter = (rect.left + rect.right) / 2 + dx;
            // Swipe up: if bottom is above vertical center
            if (dragIsVertical && draggedBottom < window.innerHeight / 2 && Math.abs(dy) > Math.abs(dx)) {
                triggerSwipeUp = true;
            }
            // Swipe left: if right edge is left of horizontal center
            if (!dragIsVertical && draggedRight < window.innerWidth / 2 && dx < 0 && Math.abs(dx) > Math.abs(dy)) {
                triggerSwipeLeft = true;
            }
            // Swipe right: if left edge is right of horizontal center
            if (!dragIsVertical && draggedLeft > window.innerWidth / 2 && dx > 0 && Math.abs(dx) > Math.abs(dy)) {
                triggerSwipeRight = true;
            }
        }
        // --- Swipe Up to Close: Content-relative threshold ---
        if (triggerSwipeUp) {
            if (lightboxContent) {
                lightboxContent.classList.remove('swiping');
                lightboxContent.classList.add('animate');
                const currentY = dy;
                const targetY = -window.innerHeight;
                const remaining = Math.abs(targetY - currentY);
                const total = Math.abs(targetY);
                const duration = 400; // ms for smooth effect
                const minScale = 0.25;
                // Animate to scale 0.25 as it slides up
                lightboxContent.style.transition = `transform ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
                lightboxContent.style.transform = `translateY(${targetY}px) scale(${minScale})`;
                // Animate lightbox opacity to 0 as it slides up
                lightbox.style.transition = `opacity ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
                lightbox.style.opacity = 0;
                if (media) media.style.transition = `opacity ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
                if (media) media.style.opacity = 0;
                const onTransitionEnd = () => {
                    lightboxContent.removeEventListener('transitionend', onTransitionEnd);
                    lightboxContent.classList.remove('animate');
                    lightboxContent.style.transition = '';
                    lightboxContent.style.transform = 'translateX(0) translateY(0) scale(1)';
                    // Reset lightbox opacity after close
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
            return;
        }
        // --- Side Swipe: Content-relative threshold ---
        if (triggerSwipeLeft) {
            if (currentLightboxIndex !== null) {
                const currentX = dx;
                const targetX = -window.innerWidth;
                const remaining = Math.abs(targetX - currentX);
                const total = Math.abs(targetX);
                const baseDuration = 450; // ms for full swipe (slowed down)
                const duration = Math.min(Math.max(180, baseDuration * (remaining / total)), 350);
                lightboxContent.classList.add('animate');
                lightboxContent.style.transition = `transform ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
                lightboxContent.style.transform = `translateX(${targetX}px)`;
                // Reset lightbox opacity for side swipes
                lightbox.style.transition = '';
                lightbox.style.opacity = '';
                const onTransitionEnd = () => {
                    lightboxContent.removeEventListener('transitionend', onTransitionEnd);
                    lightboxContent.classList.remove('animate');
                    lightboxContent.style.transition = '';
                    lightboxContent.style.transform = `translateX(0)`;
                    openLightboxByIndex(currentLightboxIndex + 1, 1, false, false, true);
                };
                lightboxContent.addEventListener('transitionend', onTransitionEnd);
            }
            return;
        }
        if (triggerSwipeRight) {
            if (currentLightboxIndex !== null) {
                const currentX = dx;
                const targetX = window.innerWidth;
                const remaining = Math.abs(targetX - currentX);
                const total = Math.abs(targetX);
                const baseDuration = 450; // ms for full swipe (slowed down)
                const duration = Math.min(Math.max(180, baseDuration * (remaining / total)), 350);
                lightboxContent.classList.add('animate');
                lightboxContent.style.transition = `transform ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
                lightboxContent.style.transform = `translateX(${targetX}px)`;
                // Reset lightbox opacity for side swipes
                lightbox.style.transition = '';
                lightbox.style.opacity = '';
                const onTransitionEnd = () => {
                    lightboxContent.removeEventListener('transitionend', onTransitionEnd);
                    lightboxContent.classList.remove('animate');
                    lightboxContent.style.transition = '';
                    lightboxContent.style.transform = `translateX(0)`;
                    openLightboxByIndex(currentLightboxIndex - 1, -1, false, false, true);
                };
                lightboxContent.addEventListener('transitionend', onTransitionEnd);
            }
            return;
        }
        // --- Snap back if no threshold met ---
        if (lightboxContent) {
            lightboxContent.classList.add('animate');
            lightboxContent.style.transform = 'translateX(0) translateY(0) scale(1)';
            lightboxContent.style.transition = '';
            // Reset media opacity only
            if (media) media.style.opacity = '';
            // Reset lightbox opacity
            lightbox.style.transition = '';
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
            console.warn('Masonry: Video failed to load or had an error:', this.src || this.currentSrc);
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
                  if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: 'projects-ready' }, '*');
                  }
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
    } else {
        console.error("Masonry: .feed-container not found. Masonry layout not initialized.");
    }

    // Fallback: If image/video fails to load, use low-res, then swap back to high-res when available
    posts.forEach(post => {
        const type = post.dataset.type;
        const lowres = post.dataset.lowres;
        const src = post.dataset.src;
        if (!lowres) return;
        let mediaEl = post.querySelector(type === 'image' ? 'img' : 'video');
        if (!mediaEl) return;
        // Only attach fallback if not already loaded
        if (type === 'image') {
            mediaEl.addEventListener('error', function onImgError() {
                if (mediaEl.src !== lowres) {
                    mediaEl.src = lowres;
                }
            });
            // Try to swap back to high-res when it loads
            const tryHighRes = new Image();
            tryHighRes.src = src;
            tryHighRes.onload = function() {
                if (mediaEl.src !== src) {
                    mediaEl.src = src;
                }
            };
        } else if (type === 'video') {
            mediaEl.addEventListener('error', function onVidError() {
                if (mediaEl.src !== lowres) {
                    mediaEl.src = lowres;
                }
            });
            // Try to swap back to high-res when it loads
            const tryHighResVid = document.createElement('video');
            tryHighResVid.src = src;
            tryHighResVid.muted = true;
            tryHighResVid.playsInline = true;
            tryHighResVid.autoplay = false;
            tryHighResVid.addEventListener('loadeddata', function() {
                if (mediaEl.src !== src) {
                    mediaEl.src = src;
                }
            });
        }
    });

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
            if (!bodyEl.classList.contains(maximizedClassName)) {
                bodyEl.classList.add(maximizedClassName);
                console.log('[ProjectsApp] Body class ADDED: projects-window-maximized');
            } else {
                console.log('[ProjectsApp] Body class ALREADY PRESENT: projects-window-maximized');
            }
        } else {
            if (bodyEl.classList.contains(maximizedClassName)) {
                bodyEl.classList.remove(maximizedClassName);
                console.log('[ProjectsApp] Body class REMOVED: projects-window-maximized');
            } else {
                console.log('[ProjectsApp] Body class ALREADY ABSENT: projects-window-maximized');
            }
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
                    console.log('[ProjectsApp] Lightbox open, desc visible. Re-evaluating animWrapper width.');
                    // Option A: Temporarily change a style that would force re-computation
                    // This is a bit of a hack but can sometimes kick the rendering engine.
                    // const originalDisplay = animWrapper.style.display;
                    // animWrapper.style.display = 'none';
                    // void animWrapper.offsetWidth; // Force reflow
                    // animWrapper.style.display = originalDisplay;

                    // Option B: Directly re-set width based on current state if CSS isn't picking it up.
                    // This means JS takes over from CSS for this specific update, which isn't ideal but can be a fix.
                    // const targetWidth = maximized ? '480px' : '350px';
                    // animWrapper.style.width = targetWidth;
                    // console.log(`[ProjectsApp] Forcing animWrapper width to: ${targetWidth}`);
                    
                    // Option C: Simpler - just ensure the transition property is there so it re-evaluates on next CSS match
                    animWrapper.style.transition = 'width 0.4s cubic-bezier(0.4,0,0.2,1)';
                     console.log('[ProjectsApp] Ensured transition property on animWrapper.');
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
                console.log('[ProjectsApp] Received window:maximized message');
                setMaximizedState(true);
            } else if (event.data.type === 'window:unmaximized') {
                console.log('[ProjectsApp] Received window:unmaximized message');
                setMaximizedState(false);
            }
            // Keep existing toolbar-action handling
            if (event.data.type === 'toolbar-action') {
                if (event.data.action === 'viewDescription') {
                    const wrapper = lightboxContent.querySelector('.lightbox-media-wrapper');
                    let description = '';
                    if (currentLightboxIndex !== null && allPosts[currentLightboxIndex]) {
                        description = allPosts[currentLightboxIndex].dataset.description;
                    }
                    toggleLightboxOverlay(description, wrapper);
                } else if (event.data.action === 'navigateHome') {
                    if (lightbox && lightbox.style.display === 'flex') {
                        closeLightbox();
                    }
                } else if (event.data.action === 'navigatePrevious') {
                    if (lightbox && lightbox.style.display === 'flex' && allPosts.length > 0) {
                        let newIndex = (currentLightboxIndex - 1 + allPosts.length) % allPosts.length;
                        openLightboxByIndex(newIndex, -1, true);
                    }
                } else if (event.data.action === 'navigateNext') {
                    if (lightbox && lightbox.style.display === 'flex' && allPosts.length > 0) {
                        let newIndex = (currentLightboxIndex + 1) % allPosts.length;
                        openLightboxByIndex(newIndex, 1, true);
                    }
                }
            }
        }
    });

    // Initialize for default (unmaximized) state
    setupIntersectionObserver();

    // Expose closeLightbox globally for message handler
    window.closeLightbox = closeLightbox;

    // Place this at the end of DOMContentLoaded, after all variables and functions are defined
    /* window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'toolbar-action') {
            if (event.data.action === 'viewDescription') {
                const wrapper = lightboxContent.querySelector('.lightbox-media-wrapper');
                let description = '';
                if (currentLightboxIndex !== null && allPosts[currentLightboxIndex]) {
                    description = allPosts[currentLightboxIndex].dataset.description;
                }
                toggleLightboxOverlay(description, wrapper);
            } else if (event.data.action === 'navigateHome') {
                if (lightbox && lightbox.style.display === 'flex') {
                    closeLightbox();
                }
            } else if (event.data.action === 'navigatePrevious') {
                if (lightbox && lightbox.style.display === 'flex' && allPosts.length > 0) {
                    let newIndex = (currentLightboxIndex - 1 + allPosts.length) % allPosts.length;
                    openLightboxByIndex(newIndex, -1, true);
                }
            } else if (event.data.action === 'navigateNext') {
                if (lightbox && lightbox.style.display === 'flex' && allPosts.length > 0) {
                    let newIndex = (currentLightboxIndex + 1) % allPosts.length;
                    openLightboxByIndex(newIndex, 1, true);
                }
            }
        }
    }); */

    // Update desc card height on window resize if open
    /* window.addEventListener('resize', () => {
        const wrapper = document.querySelector('.lightbox-media-wrapper');
        if (wrapper && wrapper.classList.contains('desc-visible')) {
            setDescCardHeight(wrapper);
        }
    }); */
});
