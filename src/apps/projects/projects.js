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
     * @param {string} poster - The poster URL for the video.
     */
    function openLightbox(type, src, titleText, subheadingText, desktopDescriptionText, mobileDescriptionText, poster, fadeInFast) {
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
            if (poster) {
                mediaElement.poster = poster;
            }
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
            lightboxContent.appendChild(mediaElement);
        }

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

        // Only add description if desktopDescriptionText is provided (CSS handles mobile visibility)
        if (desktopDescriptionText) {
            const descriptionElement = document.createElement('div');
            descriptionElement.id = 'lightbox-description';
            descriptionElement.textContent = desktopDescriptionText;
            // Try to insert it after subheading, or after title, or append directly
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

        // --- Fade-in logic ---
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
    }

    // --- Swipe Navigation for Lightbox ---
    let currentLightboxIndex = null;
    let allPosts = Array.from(document.querySelectorAll('.post'));

    function openLightboxByIndex(index, direction = 0, animate = true, fadeInFast = false) {
        if (index < 0) index = allPosts.length - 1;
        if (index >= allPosts.length) index = 0;
        const post = allPosts[index];
        if (!post) return;
        if (!direction || !animate || !lightboxContent) {
            currentLightboxIndex = index;
            const type = post.dataset.type;
            const title = post.dataset.title;
            const subheading = post.dataset.subheading;
            const desktopDescription = post.dataset.description;
            const mobileDescription = post.dataset.mobileDescription;
            const sourceData = post.dataset.src;
            const poster = post.dataset.poster;
            if (type && sourceData) {
                openLightbox(type, sourceData, title, subheading, desktopDescription, mobileDescription, poster, fadeInFast);
            }
            if (lightboxContent) {
                lightboxContent.style.transform = 'translateX(0)';
            }
            // Fade in new post (always apply now)
            fadeInNewPost(); 
            return;
        }
        // Two-step animation for swipe
        lightboxContent.classList.add('animate');
        lightboxContent.style.transform = `translateX(${direction * -100}%)`;
        setTimeout(() => {
            lightboxContent.classList.remove('animate');
            lightboxContent.style.transform = `translateX(${direction * 100}%)`;
            currentLightboxIndex = index;
            const type = post.dataset.type;
            const title = post.dataset.title;
            const subheading = post.dataset.subheading;
            const desktopDescription = post.dataset.description;
            const mobileDescription = post.dataset.mobileDescription;
            const sourceData = post.dataset.src;
            const poster = post.dataset.poster;
            if (type && sourceData) {
                openLightbox(type, sourceData, title, subheading, desktopDescription, mobileDescription, poster, fadeInFast);
            }
            setTimeout(() => {
                lightboxContent.classList.add('animate');
                lightboxContent.style.transform = 'translateX(0)';
                // Fade in new post (always apply now)
                fadeInNewPost();
            }, 20);
        }, 350);
    }

    // Modify the post click handler to set currentLightboxIndex
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
            const poster = post.dataset.poster;

            if (type && sourceData) {
                openLightbox(type, sourceData, title, subheading, desktopDescription, mobileDescription, poster);
            }
        });
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
            media.style.opacity = '0';
            media.style.transition = 'opacity 220ms cubic-bezier(0.4,0,0.2,1)';
            setTimeout(() => {
                media.style.opacity = '1';
            }, 80);
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
                const baseDuration = 200; // ms for full swipe
                const duration = Math.min(Math.max(280, baseDuration * (remaining / total)), 400);
                // Calculate current scale based on drag position
                const fadeEnd = 0.95;
                const dragRatio = Math.min(1, Math.abs(currentY) / (window.innerHeight * fadeEnd));
                const minScale = 0.25;
                const startScale = 1 - (1 - minScale) * dragRatio;
                // Animate to scale 0.25 as it slides up
                lightboxContent.style.transition = `transform ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
                lightboxContent.style.transform = `translateY(${targetY}px) scale(${minScale})`;
                // Animate lightbox opacity to 0 as it slides up
                lightbox.style.transition = `opacity ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
                lightbox.style.opacity = 0;
                if (media) media.style.opacity = 0;
                const onTransitionEnd = () => {
                    lightboxContent.removeEventListener('transitionend', onTransitionEnd);
                    lightboxContent.classList.remove('animate');
                    lightboxContent.style.transition = '';
                    lightboxContent.style.transform = 'translateX(0) translateY(0) scale(1)';
                    // Reset lightbox opacity after close
                    lightbox.style.transition = '';
                    lightbox.style.opacity = '';
                    if (media) media.style.opacity = '';
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
                const baseDuration = 250; // ms for full swipe
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
                    openLightboxByIndex(currentLightboxIndex + 1, 1, false);
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
                const baseDuration = 250; // ms for full swipe
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
                    openLightboxByIndex(currentLightboxIndex - 1, -1, false);
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
        // Toggle .maximized class on all .video-posts for overlay
        document.querySelectorAll('.video-post').forEach(post => {
            if (isMaximized) {
                post.classList.add('maximized');
            } else {
                post.classList.remove('maximized');
            }
        });
        if (isMaximized) {
            cleanupIntersectionObserver();
            gridVideos.forEach(video => {
                video.play();
            });
        } else {
            gridVideos.forEach(video => {
                video.pause();
            });
            setupIntersectionObserver();
        }
    }

    // Listen for maximize/unmaximize messages from parent
    window.addEventListener('message', (event) => {
        if (!event.data || typeof event.data.type !== 'string') return;
        if (event.data.type === 'window:maximized') {
            setMaximizedState(true);
        } else if (event.data.type === 'window:unmaximized') {
            setMaximizedState(false);
        }
    });

    // Initialize for default (unmaximized) state
    setupIntersectionObserver();

    // Expose closeLightbox globally for message handler
    window.closeLightbox = closeLightbox;

    // --- Desktop Lightbox Navigation Buttons & Hint ---
    const arrowLeft = document.getElementById('lightbox-arrow-left');
    const arrowRight = document.getElementById('lightbox-arrow-right');
    const closeBtn = document.getElementById('lightbox-close-btn');
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

    function handleNavKey(e, action) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            action();
        }
    }

    function fadeOutCurrentMedia(callback) {
        if (!isDesktop() || !lightboxContent) {
            callback();
            return;
        }
        const media = lightboxContent.querySelector('img, video');
        if (!media) {
            callback();
            return;
        }
        media.style.transition = 'opacity 180ms cubic-bezier(0.4,0,0.2,1)';
        // Force reflow
        void media.offsetWidth;
        media.style.opacity = '0';
        function onTransitionEnd(e) {
            if (e.target === media && e.propertyName === 'opacity') {
                media.removeEventListener('transitionend', onTransitionEnd);
                if (media.parentNode) media.parentNode.removeChild(media);
                callback();
            }
        }
        media.addEventListener('transitionend', onTransitionEnd);
    }

    // Crossfade for desktop button navigation (no fade out, just fade in new media)
    function crossfadeToNewMedia(newIndex) {
        if (!isDesktop() || !lightboxContent) {
            openLightboxByIndex(newIndex, 0, true);
            return;
        }
        const oldMedia = lightboxContent.querySelector('img, video');
        const post = allPosts[newIndex];
        if (!post) return;
        // Prepare new media element
        const type = post.dataset.type;
        const src = post.dataset.src;
        const poster = post.dataset.poster;
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
            if (poster) newMedia.poster = poster;
        }
        if (!newMedia) return;
        newMedia.style.opacity = '0';
        newMedia.style.transition = 'opacity 120ms cubic-bezier(0.4,0,0.2,1)';
        // Remove old media immediately
        if (oldMedia && oldMedia.parentNode) oldMedia.parentNode.removeChild(oldMedia);
        lightboxContent.appendChild(newMedia);
        // Fade in new media
        setTimeout(() => {
            newMedia.style.opacity = '1';
        }, 10);
        // Update details (title, subheading, description)
        const title = post.dataset.title;
        const subheading = post.dataset.subheading;
        const desktopDescription = post.dataset.description;
        const mobileDescription = post.dataset.mobileDescription;
        // Remove old details
        const existingTitle = lightboxDetails.querySelector('#lightbox-title');
        if (existingTitle) lightboxDetails.removeChild(existingTitle);
        const existingSubheading = lightboxDetails.querySelector('#lightbox-subheading');
        if (existingSubheading) lightboxDetails.removeChild(existingSubheading);
        const existingDescription = lightboxDetails.querySelector('#lightbox-description');
        if (existingDescription) lightboxDetails.removeChild(existingDescription);
        // Add new details
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
        currentLightboxIndex = newIndex;
    }

    if (arrowLeft) {
        arrowLeft.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentLightboxIndex !== null) {
                crossfadeToNewMedia((currentLightboxIndex - 1 + allPosts.length) % allPosts.length);
            }
        });
        arrowLeft.addEventListener('keydown', (e) => handleNavKey(e, () => {
            if (currentLightboxIndex !== null) {
                openLightboxByIndex(currentLightboxIndex - 1, -1, true);
            }
        }));
    }
    if (arrowRight) {
        arrowRight.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentLightboxIndex !== null) {
                crossfadeToNewMedia((currentLightboxIndex + 1) % allPosts.length);
            }
        });
        arrowRight.addEventListener('keydown', (e) => handleNavKey(e, () => {
            if (currentLightboxIndex !== null) {
                openLightboxByIndex(currentLightboxIndex + 1, 1, true);
            }
        }));
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeLightbox();
        });
        closeBtn.addEventListener('keydown', (e) => handleNavKey(e, closeLightbox));
    }

    // Keyboard navigation (already present, but ensure hint is shown)
    document.addEventListener('keydown', (event) => {
        if (!isDesktop() || lightbox.style.display !== 'flex') return;
        if (event.key === 'ArrowLeft') {
            if (currentLightboxIndex !== null) {
                openLightboxByIndex(currentLightboxIndex - 1, -1, true);
            }
        } else if (event.key === 'ArrowRight') {
            if (currentLightboxIndex !== null) {
                openLightboxByIndex(currentLightboxIndex + 1, 1, true);
            }
        }
    });

    // Show hint when lightbox opens (desktop only)
    const origOpenLightbox = openLightbox;
    openLightbox = function(...args) {
        origOpenLightbox.apply(this, args);
        if (isDesktop()) {
            showDesktopHint();
        }
    };
});

// Move this outside DOMContentLoaded so it is always registered
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'close-lightbox') {
        if (typeof closeLightbox === 'function') {
            closeLightbox();
        }
    }
    // Handle toolbar-action for Home button
    if (event.data && event.data.type === 'toolbar-action' && event.data.action === 'navigateHome') {
        if (typeof closeLightbox === 'function') {
            closeLightbox();
        }
    }
});
