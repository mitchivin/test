// JavaScript for Projects App Lightbox

document.addEventListener('DOMContentLoaded', () => {
    const lightbox = document.getElementById('project-lightbox');
    const lightboxContent = document.getElementById('lightbox-content');
    const lightboxDetails = document.getElementById('lightbox-details');
    const lightboxClose = document.getElementById('lightbox-close');
    const posts = document.querySelectorAll('.post');
    const feedContainer = document.querySelector('.feed-container');

    if (!lightbox || !lightboxContent || !lightboxDetails || !lightboxClose || !feedContainer) {
        console.error('Lightbox, feedContainer, or critical elements not found, or no posts available.');
        return;
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
    function openLightbox(type, src, titleText, subheadingText, desktopDescriptionText, mobileDescriptionText, poster) {
        // Pause all grid videos
        document.querySelectorAll('.feed-container video').forEach(v => { v.pause(); });

        // Set aspect ratio for lightbox-content if video and metadata available
        if (type === 'video' && window.preloadedVideoMeta && window.preloadedVideoMeta[src]) {
            const meta = window.preloadedVideoMeta[src];
            if (meta.width && meta.height) {
                lightboxContent.style.aspectRatio = `${meta.width} / ${meta.height}`;
                lightboxContent.style.minHeight = '200px'; // fallback for old browsers
            }
        } else {
            lightboxContent.style.aspectRatio = '';
            lightboxContent.style.minHeight = '';
        }

        // Determine if desktop layout should be used based on feedContainer width
        const isDesktopView = feedContainer.offsetWidth >= 768; 

        if (isDesktopView) {
            if (!lightbox.classList.contains('desktop-layout')) {
                lightbox.classList.add('desktop-layout');
            }
        } else {
            if (lightbox.classList.contains('desktop-layout')) {
                lightbox.classList.remove('desktop-layout');
            }
        }

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
        }

        if (mediaElement) {
            lightboxContent.appendChild(mediaElement);
        }

        if (titleText) {
            const titleElement = document.createElement('div');
            titleElement.id = 'lightbox-title';
            titleElement.textContent = titleText;
            if (lightboxDetails) {
                lightboxDetails.insertBefore(titleElement, lightboxClose);
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
                lightboxDetails.insertBefore(subheadingElement, lightboxClose);
            }
        }

        // Only add description if in desktop layout and desktopDescriptionText is provided
        if (lightbox.classList.contains('desktop-layout') && desktopDescriptionText) {
            const descriptionElement = document.createElement('div');
            descriptionElement.id = 'lightbox-description';
            descriptionElement.textContent = desktopDescriptionText;
            // Try to insert it after subheading, or after title, or before close button
            const subheadingEl = lightboxDetails.querySelector('#lightbox-subheading');
            const titleEl = lightboxDetails.querySelector('#lightbox-title');
            if (subheadingEl && subheadingEl.nextSibling) {
                lightboxDetails.insertBefore(descriptionElement, subheadingEl.nextSibling);
            } else if (titleEl && titleEl.nextSibling) {
                 lightboxDetails.insertBefore(descriptionElement, titleEl.nextSibling);
            } else if (lightboxDetails) {
                lightboxDetails.insertBefore(descriptionElement, lightboxClose);
            }
        }

        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    /**
     * Closes the lightbox.
     */
    function closeLightbox() {
        lightbox.style.display = 'none';
        const mediaElement = lightboxContent.querySelector('video, img');
        if (mediaElement && mediaElement.tagName === 'VIDEO') {
            mediaElement.pause();
            mediaElement.removeAttribute('src');
            mediaElement.load();
        }
        lightboxContent.innerHTML = '';
        lightboxContent.style.aspectRatio = '';
        lightboxContent.style.minHeight = '';
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
    }

    posts.forEach(post => {
        post.addEventListener('click', (event) => {
            if (event.target.tagName === 'A') {
                return;
            }
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

    lightboxClose.addEventListener('click', closeLightbox);
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

        if (columnWidth <= 0) {
            console.error("Masonry: Calculated column width is zero or negative.", { availableWidth, numColumns, gap });
            feedContainerPosts.forEach(post => {
                post.style.position = 'static'; // Revert to static flow
                post.style.width = ''; 
            });
            feedContainer.style.height = 'auto';
            return; 
        }

        feedContainerPosts.forEach(post => {
            post.style.position = 'absolute'; 
            post.style.width = `${columnWidth}px`;
        });

        const columnHeights = Array(numColumns).fill(0);

        feedContainerPosts.forEach(post => {
            const postHeight = post.offsetHeight;
            if (postHeight === 0 && post.querySelector('img, video')) {
            }
            
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

        // Ensure feedContainerPosts is up-to-date if posts can be added dynamically later.
        // For this initial load, it's fine as defined earlier in DOMContentLoaded.
        // If posts are added, this Array needs to be updated before calling this function.
        
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

        if (videosReported === videosToMonitor && videosToMonitor > 0) { // Ensure it only applies if there were videos
            applyMasonryLayout();
        } else if (videosToMonitor === 0) { // Should have been caught earlier, but defensive
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
        if (mediaElements.length === 0) {
            // No media, notify immediately
            setTimeout(() => {
              if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'projects-ready' }, '*');
              }
            }, 0);
        } else {
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

    // The new initMasonryWithVideoCheck and its resize listener replace the old approach.

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
    let hoverListeners = [];

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

    function setupHoverListeners() {
        cleanupHoverListeners();
        hoverListeners = gridVideos.map(video => {
            const onEnter = () => video.play();
            const onLeave = () => video.pause();
            video.addEventListener('mouseenter', onEnter);
            video.addEventListener('mouseleave', onLeave);
            return { video, onEnter, onLeave };
        });
    }

    function cleanupHoverListeners() {
        hoverListeners.forEach(({ video, onEnter, onLeave }) => {
            video.removeEventListener('mouseenter', onEnter);
            video.removeEventListener('mouseleave', onLeave);
        });
        hoverListeners = [];
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
            gridVideos.forEach(video => video.pause());
            setupHoverListeners();
        } else {
            cleanupHoverListeners();
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
});
