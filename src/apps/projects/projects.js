// JavaScript for Projects App Lightbox

document.addEventListener('DOMContentLoaded', () => {
    const lightbox = document.getElementById('project-lightbox');
    const lightboxContent = document.getElementById('lightbox-content');
    const lightboxDetails = document.getElementById('lightbox-details');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');
    const posts = document.querySelectorAll('.post'); // Select all posts, including carousel
    const feedContainer = document.querySelector('.feed-container'); // Get reference to feed container

    let currentCarouselImages = [];
    let currentCarouselIndex = 0;

    if (!lightbox || !lightboxContent || !lightboxDetails || !lightboxClose || !lightboxPrev || !lightboxNext || posts.length === 0) {
        console.error('Lightbox or navigation elements not found, or no posts available.');
        return;
    }

    function showCarouselImage(index) {
        if (currentCarouselImages.length === 0) return;
        lightboxContent.innerHTML = ''; // Clear previous content
        const img = document.createElement('img');
        img.src = currentCarouselImages[index];
        img.alt = 'Carousel Image ' + (index + 1);
        lightboxContent.appendChild(img);
        currentCarouselIndex = index;
    }

    lightboxPrev.addEventListener('click', () => {
        if (currentCarouselImages.length === 0) return;
        let newIndex = currentCarouselIndex - 1;
        if (newIndex < 0) {
            newIndex = currentCarouselImages.length - 1; // Wrap to last
        }
        showCarouselImage(newIndex);
    });

    lightboxNext.addEventListener('click', () => {
        if (currentCarouselImages.length === 0) return;
        let newIndex = currentCarouselIndex + 1;
        if (newIndex >= currentCarouselImages.length) {
            newIndex = 0; // Wrap to first
        }
        showCarouselImage(newIndex);
    });

    /**
     * Opens the lightbox with the specified media type and source.
     * @param {string} type - The type of media to display (image, video, carousel).
     * @param {string|string[]} srcOrImages - The source URL(s) of the media.
     * @param {string} captionText - The caption text to display.
     */
    function openLightbox(type, srcOrImages, captionText) {
        // --- Check Feed Layout BEFORE opening --- 
        const feedStyle = window.getComputedStyle(feedContainer);
        const columnCount = parseInt(feedStyle.getPropertyValue('column-count'), 10);
        
        console.log(`Feed column count detected: ${columnCount}`); // Keep this log for now

        if (columnCount >= 3) {
            if (!lightbox.classList.contains('desktop-layout')) {
                console.log('Applying desktop-layout class based on feed columns.');
                lightbox.classList.add('desktop-layout');
            }
        } else {
            if (lightbox.classList.contains('desktop-layout')) {
                console.log('Removing desktop-layout class based on feed columns.');
                lightbox.classList.remove('desktop-layout');
            }
        }
        // --- End Feed Layout Check ---

        // Clear previous content
        lightboxContent.innerHTML = '';
        // Remove existing caption if present
        const existingCaption = lightboxDetails.querySelector('#lightbox-caption');
        if (existingCaption) {
            lightboxDetails.removeChild(existingCaption);
        }

        // Hide carousel nav by default
        lightboxPrev.style.display = 'none';
        lightboxNext.style.display = 'none';
        currentCarouselImages = []; // Reset carousel images

        let mediaElement;

        if (type === 'image') {
            mediaElement = document.createElement('img');
            mediaElement.src = srcOrImages;
            mediaElement.alt = 'Project Lightbox Image';
        } else if (type === 'video') {
            mediaElement = document.createElement('video');
            mediaElement.src = srcOrImages;
            mediaElement.controls = true;
            mediaElement.autoplay = true;
            mediaElement.loop = true;
            mediaElement.alt = 'Project Lightbox Video';
            mediaElement.setAttribute('playsinline', '');
        } else if (type === 'carousel') {
            currentCarouselImages = srcOrImages.split(',');
            if (currentCarouselImages.length > 0) {
                showCarouselImage(0); // Display the first image
                if (currentCarouselImages.length > 1) { // Only show nav if multiple images
                    lightboxPrev.style.display = 'block';
                    lightboxNext.style.display = 'block';
                }
            } else {
                // Handle empty carousel if necessary, maybe show a placeholder
                lightboxContent.textContent = 'No images in this carousel.';
            }
        }

        if (mediaElement) { // For image and video types
            lightboxContent.appendChild(mediaElement);
        }

        if (captionText) {
            const captionElement = document.createElement('div');
            captionElement.id = 'lightbox-caption';
            captionElement.textContent = captionText;
            // Prepend caption to lightbox-details so close button remains last visually
            if (lightboxDetails) {
                lightboxDetails.insertBefore(captionElement, lightboxClose);
            }
        }

        lightbox.style.display = 'flex'; // Show lightbox
        document.body.style.overflow = 'hidden'; // Prevent background scroll
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
        lightboxContent.innerHTML = ''; // Clear media content
        // Remove caption if it exists (from lightbox-details)
        const captionElement = document.getElementById('lightbox-caption');
        if (captionElement) {
            captionElement.remove();
        }
        // Hide carousel nav when closing
        lightboxPrev.style.display = 'none';
        lightboxNext.style.display = 'none';
        currentCarouselImages = []; // Reset carousel state
        currentCarouselIndex = 0;
    }

    // Add click listeners to posts
    posts.forEach(post => {
        post.addEventListener('click', (event) => {
            if (event.target.tagName === 'A') {
                return;
            }
            const type = post.dataset.type;
            const caption = post.dataset.caption;
            let sourceData;

            if (type === 'carousel') {
                sourceData = post.dataset.images;
            } else {
                sourceData = post.dataset.src;
            }

            if (type && sourceData) {
                openLightbox(type, sourceData, caption);
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
});
