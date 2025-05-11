import { PROJECTS_ASSETS } from './preloadAssets.js';

export function preloadProjectsAssets() {
  const imageExts = ['.webp', '.jpg', '.jpeg', '.png', '.gif'];
  const videoExts = ['.mp4', '.webm', '.ogg'];
  const videoMetaMap = {};
  const preloadPromises = PROJECTS_ASSETS.map(url => {
    if (imageExts.some(ext => url.endsWith(ext))) {
      return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve();
        img.onerror = () => reject(url);
        img.src = url;
      });
    } else if (videoExts.some(ext => url.endsWith(ext))) {
      return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'auto';
        video.muted = true;
        video.setAttribute('playsinline', '');
        video.onloadedmetadata = () => {
          videoMetaMap[url] = {
            width: video.videoWidth,
            height: video.videoHeight,
            video
          };
          resolve();
        };
        video.onerror = () => reject(url);
        video.src = url;
      });
    } else {
      return Promise.resolve();
    }
  });
  return Promise.all(preloadPromises).then(() => videoMetaMap);
} 