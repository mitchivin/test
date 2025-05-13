import { resumeImage } from '../../data/resume.js';

window.addEventListener('message', function(event) {
  const appRoot = document.getElementById('appRoot');
  if (!appRoot) return;

  if (event.data && event.data.type === 'window:maximized') {
    appRoot.classList.add('maximized-mode');
  } else if (event.data && event.data.type === 'window:unmaximized') {
    appRoot.classList.remove('maximized-mode');
  }
});

document.addEventListener('DOMContentLoaded', () => {

  const resumeImageElem = document.getElementById('resumeImage');
  const scroller = document.getElementById('appRoot');

  if (!resumeImageElem || !scroller) {
    console.error("Resume image or scroller element not found.");
    return;
  }

  // Set the resume image src from data
  resumeImageElem.src = resumeImage;

  function initializeZoomPan() {
    let isDragging = false;
    let startX, startY, startScrollLeft, startScrollTop;
    let didDrag = false;

    resumeImageElem.addEventListener('dragstart', (e) => e.preventDefault());

    resumeImageElem.addEventListener('click', (e) => {
      if (didDrag) {
        didDrag = false;
        return;
      }
      const isZoomed = resumeImageElem.classList.contains('zoomed');
      if (!isZoomed) {
        const clickX = e.offsetX;
        const clickY = e.offsetY;
        const originalWidth = resumeImageElem.clientWidth;
        const originalHeight = resumeImageElem.clientHeight;

        if (originalWidth === 0 || originalHeight === 0) {
            console.warn("Resume image dimensions are zero. Zoom may not work correctly yet.");
            return; 
        }

        resumeImageElem.classList.add('zoomed');
        requestAnimationFrame(() => {
          const zoomedWidth = resumeImageElem.clientWidth;
          const scale = zoomedWidth / originalWidth;
          const targetX = clickX * scale;
          const targetY = clickY * scale;
          const viewportWidth = scroller.clientWidth;
          const viewportHeight = scroller.clientHeight;
          let targetScrollLeft = targetX - viewportWidth / 2;
          let targetScrollTop = targetY - viewportHeight / 2;
          targetScrollLeft = Math.max(0, Math.min(targetScrollLeft, scroller.scrollWidth - viewportWidth));
          targetScrollTop = Math.max(0, Math.min(targetScrollTop, scroller.scrollHeight - viewportHeight));
          scroller.scrollTo({ left: targetScrollLeft, top: targetScrollTop, behavior: 'auto' });
        });
      } else {
        resumeImageElem.classList.remove('zoomed');
        scroller.scrollTo({ left: 0, top: 0, behavior: 'auto' });
      }
      // Notify parent of interaction for Start Menu closing
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'resume-interaction' }, '*');
      }
    });

    resumeImageElem.addEventListener('mousedown', (e) => {
      // Only allow panning if zoomed
      if (!resumeImageElem.classList.contains('zoomed')) return; 
      isDragging = true;
      didDrag = false;
      resumeImageElem.classList.add('dragging');
      startX = e.clientX;
      startY = e.clientY;
      startScrollLeft = scroller.scrollLeft;
      startScrollTop = scroller.scrollTop;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      didDrag = true;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      scroller.scrollLeft = startScrollLeft - dx;
      scroller.scrollTop = startScrollTop - dy;
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      resumeImageElem.classList.remove('dragging');
    });

    document.addEventListener('mouseleave', () => { // Changed from resumeImage to document
      if (isDragging) {
        isDragging = false;
        resumeImageElem.classList.remove('dragging');
      }
    });
  }

  // Check if the image is already loaded (e.g. from cache)
  if (resumeImageElem.complete && resumeImageElem.naturalWidth !== 0) {
    initializeZoomPan();
  } else {
    // Otherwise, wait for the load event
    resumeImageElem.addEventListener('load', initializeZoomPan);
    resumeImageElem.addEventListener('error', () => {
        console.error("Resume image failed to load.");
    });
  }
});

document.addEventListener('click', (event) => {
  // Optionally: filter out clicks inside your own popouts/menus if needed
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'iframe-interaction' }, '*');
  }
}); 