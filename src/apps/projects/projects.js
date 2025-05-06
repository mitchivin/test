// JavaScript for Projects App Lightbox

document.addEventListener('DOMContentLoaded', () => {
    const lightbox = document.getElementById('project-lightbox');
    const lightboxContent = document.getElementById('lightbox-content');
    const lightboxDetails = document.getElementById('lightbox-details');
    const lightboxClose = document.getElementById('lightbox-close');
    const posts = document.querySelectorAll('.post');
    const feedContainer = document.querySelector('.feed-container');

    if (!lightbox || !lightboxContent || !lightboxDetails || !lightboxClose || posts.length === 0) {
        console.error('Lightbox or critical elements not found, or no posts available.');
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
     */
    function openLightbox(type, src, titleText, subheadingText, desktopDescriptionText, mobileDescriptionText) {
        const feedStyle = window.getComputedStyle(feedContainer);
        const columnCount = parseInt(feedStyle.getPropertyValue('column-count'), 10);
        
        console.log(`Feed column count detected: ${columnCount}`);

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
            } else {
                lightboxDetails.insertBefore(subheadingElement, lightboxClose);
            }
        }

        let descriptionText;
        if (lightbox.classList.contains('desktop-layout')) {
            descriptionText = desktopDescriptionText;
        }

        if (descriptionText) {
            const descriptionElement = document.createElement('div');
            descriptionElement.id = 'lightbox-description';
            descriptionElement.textContent = descriptionText;
            lightboxDetails.insertBefore(descriptionElement, lightboxClose);
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

            if (type && sourceData) {
                openLightbox(type, sourceData, title, subheading, desktopDescription, mobileDescription);
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
