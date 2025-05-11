// ==================================================
//  boot.js — Boot Sequence & Login Handling for Windows XP Simulation
// ==================================================
/**
 * Handles the boot animation, login process, and session state for the Windows XP simulation.
 * - Manages transitions between boot, login, and desktop screens.
 * - Handles session persistence and event-driven logoff/shutdown.
 * - Integrates with the event bus for cross-component communication.
 *
 * @module boot
 */

import { showNetworkBalloon } from "./taskbar.js";

// ===== Boot Sequence Initialization =====
/**
 * Initialize the boot sequence and login handling.
 * @param {Object} eventBus - Pub/sub event bus instance
 * @param {Object} EVENTS - Event name constants
 */
export function initBootSequence(eventBus, EVENTS) {
  const bootScreen = document.getElementById("boot-screen");
  const loginScreen = document.getElementById("login-screen");
  const desktop = document.querySelector(".desktop");
  const crtScanline = document.querySelector(".crt-scanline");
  const crtVignette = document.querySelector(".crt-vignette");
  const urlParams = new URLSearchParams(window.location.search);
  const forceBoot = urlParams.get("forceBoot") === "true";

  // Preload login and logoff sounds for instant playback
  const loginSound = new Audio("./assets/sounds/login.wav");
  const logoffSound = new Audio("./assets/sounds/logoff.wav");
  loginSound.load();
  logoffSound.load();

  // Boot logic: force boot, skip for returning users, or run full sequence
  if (forceBoot) {
    const newUrl = window.location.pathname + window.location.hash;
    history.replaceState({}, document.title, newUrl);
    sessionStorage.removeItem("logged_in");
    startBootSequence();
  } else {
    const hasLoggedIn = sessionStorage.getItem("logged_in") === "true";
    if (hasLoggedIn) {
      skipBootSequence();
    } else {
      startBootSequence();
    }
  }

  /**
   * Instantly show desktop for returning users (bypass boot/login)
   */
  function skipBootSequence() {
    bootScreen.style.display = "none";
    loginScreen.style.display = "none";
    desktop.style.opacity = "1";
    desktop.style.pointerEvents = "auto";
  }

  /**
   * Run the animated boot sequence, then show login screen.
   */
  function startBootSequence() {
    setTimeout(() => {
      desktop.style.opacity = "0";
      desktop.style.pointerEvents = "none";
      if (crtScanline) crtScanline.style.display = "none";
      if (crtVignette) crtVignette.style.display = "none";
      if (!bootScreen) return;
      bootScreen.style.display = "flex";
      bootScreen.style.opacity = "1";
      bootScreen.style.pointerEvents = "auto";

      // --- NEW: Initiate project video preloading ---
      preloadProjectVideosInBackground();
      // --- END NEW ---

      const minBootTime = 5500; // Minimum boot duration (ms)
      setTimeout(() => {
        bootScreen.classList.remove("boot-fade-in");
        setTimeout(() => {
          // Fade to black overlay, then show login
          const fadeoutOverlay = document.getElementById("boot-fadeout-overlay");
          if (fadeoutOverlay) {
            fadeoutOverlay.style.display = "block";
            void fadeoutOverlay.offsetWidth;
            fadeoutOverlay.style.transition = "opacity 0.5s";
            fadeoutOverlay.style.opacity = "1";
            setTimeout(() => {
              bootScreen.style.display = "none";
              loginScreen.style.display = "flex";
              loginScreen.style.opacity = "1";
              loginScreen.style.pointerEvents = "auto";
              const loginContent = loginScreen.querySelector(".login-screen");
              if (loginContent) loginContent.style.opacity = "1";
              attachLoginScreenHandlers();
              fadeoutOverlay.style.opacity = "0";
              setTimeout(() => {
                fadeoutOverlay.style.display = "none";
              }, 500);
            }, 1150); // 150ms fade + 1s black
          }
        }, 250);
      }, minBootTime - 1400); // Start fadeout before boot ends
    }, 1000); // Pre-boot overlay delay
  }

  /**
   * Handle successful login: fade out login, show welcome, then desktop.
   */
  function handleLoginSuccess() {
    const loginContent = loginScreen.querySelector(".login-screen");
    const welcomeMsg = loginScreen.querySelector(".welcome-message");
    const fadeTargets = [
      loginContent.querySelector(".back-gradient"),
      loginContent.querySelector(".turn-off"),
      loginContent.querySelector(".right-bottom"),
      loginContent.querySelector(".xp-logo-image"),
      loginContent.querySelector(".left-text"),
      loginContent.querySelector(".login-separator.mobile-only")
    ];
    fadeTargets.forEach(el => {
      if (el) {
        el.style.transition = "opacity 0.15s";
        el.style.opacity = "0";
      }
    });
    setTimeout(() => {
      fadeTargets.forEach(el => { if (el) el.style.display = "none"; });
      setTimeout(() => {
        welcomeMsg.style.display = "block";
        setTimeout(() => {
          welcomeMsg.classList.add("visible");
        }, 10);
      }, 500);
      setTimeout(() => {
        welcomeMsg.classList.remove("visible");
        loginScreen.style.display = "none";
        loginScreen.style.pointerEvents = "none";
        loginScreen.style.opacity = "0";
        desktop.style.opacity = "1";
        desktop.style.pointerEvents = "auto";
        if (crtScanline) crtScanline.style.display = "block";
        if (crtVignette) crtVignette.style.display = "block";
        document.dispatchEvent(new CustomEvent("reinitScanline"));
        try {
          loginSound.currentTime = 0;
          loginSound.play();
        } catch {}
        sessionStorage.setItem("logged_in", "true");
        setTimeout(() => {
          if (
            typeof showNetworkBalloon === "function" &&
            !document.getElementById("balloon-root")
          ) {
            showNetworkBalloon();
          }
        }, 3000);
      }, 2500);
    }, 150);
  }

  // Listen for shutdown requests from login iframe
  window.addEventListener("message", (event) => {
    if (event.data?.type === "shutdownRequest") {
      if (eventBus && EVENTS) {
        eventBus.publish(EVENTS.SHUTDOWN_REQUESTED);
      }
    }
  });

  // Log off: show login screen, hide desktop, reset session
  if (!eventBus || !EVENTS) return;
  eventBus.subscribe(EVENTS.LOG_OFF_REQUESTED, () => {
    try {
      logoffSound.currentTime = 0;
      logoffSound.play();
    } catch {}
    const balloon = document.getElementById("balloon-root");
    if (balloon && balloon.parentNode) {
      balloon.parentNode.removeChild(balloon);
    }
    loginScreen.style.display = "flex";
    loginScreen.style.opacity = "1";
    loginScreen.style.pointerEvents = "auto";
    desktop.style.opacity = "0";
    desktop.style.pointerEvents = "none";
    if (crtScanline) crtScanline.style.display = "none";
    if (crtVignette) crtVignette.style.display = "none";
    const loginContent = loginScreen.querySelector(".login-screen");
    if (loginContent) {
      loginContent.style.opacity = "1";
      loginContent.style.display = "block";
      loginContent.style.pointerEvents = "auto";
      // Restore all faded/hidden elements
      const restoreTargets = [
        loginContent.querySelector(".back-gradient"),
        loginContent.querySelector(".turn-off"),
        loginContent.querySelector(".right-bottom"),
        loginContent.querySelector(".xp-logo-image"),
        loginContent.querySelector(".left-text"),
        loginContent.querySelector(".login-separator.mobile-only")
      ];
      restoreTargets.forEach(el => {
        if (el) {
          if (el.classList.contains('login-separator') && el.classList.contains('mobile-only')) {
            el.style.opacity = '0.25';
          } else {
            el.style.opacity = '1';
          }
          el.style.display = "";
          el.style.transition = "";
        }
      });
    }
    // Hide welcome message if visible
    const welcomeMsg = loginScreen.querySelector(".welcome-message");
    if (welcomeMsg) {
      welcomeMsg.classList.remove("visible");
      welcomeMsg.style.display = "none";
    }
    sessionStorage.setItem("logged_in", "false");
    attachLoginScreenHandlers();
  });

  /**
   * Attach login and shutdown event listeners to login screen elements.
   * Ensures listeners are attached every time the login screen is shown.
   */
  function attachLoginScreenHandlers() {
    const profileElement = document.querySelector(".back-gradient");
    if (profileElement && !profileElement._loginHandlerAttached) {
      profileElement.addEventListener("click", function () {
        profileElement.classList.add("active");
        handleLoginSuccess();
      });
      profileElement._loginHandlerAttached = true;
    }
    const shutdownIcon = document.getElementById("shutdown-icon");
    if (shutdownIcon && !shutdownIcon._shutdownHandlerAttached) {
      shutdownIcon.addEventListener("click", () => {
        if (eventBus && EVENTS) {
          eventBus.publish(EVENTS.SHUTDOWN_REQUESTED);
        }
      });
      shutdownIcon._shutdownHandlerAttached = true;
    }
  }
}

// --- NEW: Function to handle preloading of project videos ---
async function preloadProjectVideosInBackground() {
  console.log("Boot: Starting project video preloading...");
  const iframeContainer = document.createElement('div');
  iframeContainer.id = 'project-preloader-iframe-container';
  iframeContainer.style.display = 'none'; // Keep it hidden
  document.body.appendChild(iframeContainer);

  const iframe = document.createElement('iframe');
  iframe.style.width = '1px'; // Minimize resource usage for the iframe itself
  iframe.style.height = '1px';
  iframe.style.opacity = '0';
  iframe.style.position = 'absolute';
  iframe.style.top = '-100px'; // Move off-screen
  iframe.style.left = '-100px';
  iframe.style.border = 'none';
  iframeContainer.appendChild(iframe);

  // Create a promise that resolves when iframe content is loaded
  const iframeLoadPromise = new Promise((resolve, reject) => {
    iframe.onload = () => {
      console.log("Boot: projects.html iframe loaded for preloading.");
      resolve(iframe.contentDocument);
    };
    iframe.onerror = (err) => {
      console.error("Boot: Error loading projects.html iframe for preloading.", err);
      reject(new Error("Iframe load error for projects.html"));
      if (iframeContainer.parentNode) {
        iframeContainer.parentNode.removeChild(iframeContainer);
      }
    };
  });

  // Path to projects.html relative to index.html
  iframe.src = './src/apps/projects/projects.html';

  try {
    const projectsDoc = await iframeLoadPromise;
    if (!projectsDoc) {
      console.error("Boot: Projects document within iframe is null after load.");
      if (iframeContainer.parentNode) iframeContainer.parentNode.removeChild(iframeContainer);
      return;
    }

    const videoPosts = projectsDoc.querySelectorAll('.post.video-post');
    console.log(`Boot: Found ${videoPosts.length} video posts in projects.html to preload.`);

    if (videoPosts.length === 0) {
      console.log("Boot: No video posts found to preload. Cleaning up.");
      if (iframeContainer.parentNode) iframeContainer.parentNode.removeChild(iframeContainer);
      return;
    }

    const preloadPromises = [];
    const tempVideoElements = []; // To keep track of elements for potential later cleanup

    videoPosts.forEach((post, index) => {
      const videoDataSrc = post.dataset.src;
      if (videoDataSrc) {
        // Important: Resolve the relative data-src path correctly.
        // The data-src is relative to projects.html.
        // We need to make it relative to index.html or an absolute path.
        // Assuming projects.html is at 'src/apps/projects/projects.html'
        // and data-src is like '../../../assets/apps/projects/video1.mp4'
        // It correctly resolves to 'assets/apps/projects/video1.mp4' from root.
        const resolvedVideoSrc = new URL(videoDataSrc, iframe.src).href;

        console.log(`Boot: Attempting to preload video ${index + 1}: ${resolvedVideoSrc}`);
        
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'auto'; // Hint to the browser
        
        const videoLoadPromise = new Promise((resolveVideo, rejectVideo) => {
          tempVideo.onloadeddata = () => {
            console.log(`Boot: Video ${resolvedVideoSrc} event: loadeddata.`);
            resolveVideo(resolvedVideoSrc);
          };
          tempVideo.onerror = (e) => {
            console.error(`Boot: Error preloading video ${resolvedVideoSrc}:`, e.message || e);
            rejectVideo(new Error(`Error loading ${resolvedVideoSrc}`));
          };
          // Fallback timeout for each video
          setTimeout(() => rejectVideo(new Error(`Timeout preloading ${resolvedVideoSrc}`)), 10000); // 10s timeout per video
        }).catch(err => {
            // Catch individual video errors so Promise.allSettled still works
            console.warn(`Boot: Caught error for ${resolvedVideoSrc} during preload promise:`, err.message);
            return { status: 'rejected', reason: err.message, video: resolvedVideoSrc };
        });
        
        preloadPromises.push(videoLoadPromise);
        
        tempVideo.src = resolvedVideoSrc;
        tempVideo.load(); // Explicitly call load

        // Append to a hidden part of the main document to ensure loading
        tempVideo.style.display = 'none';
        document.body.appendChild(tempVideo);
        tempVideoElements.push(tempVideo);
      }
    });

    Promise.allSettled(preloadPromises).then(results => {
      console.log("Boot: Preloading attempts for project videos settled.");
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          console.log(`Boot: Successfully initiated preload for: ${result.value}`);
        } else {
          console.warn(`Boot: Failed to initiate/complete preload for a video: ${result.reason?.video || result.reason}`);
        }
      });
      
      // Cleanup after all attempts
      console.log("Boot: Cleaning up project video preloading iframe and temporary video elements.");
      if (iframeContainer.parentNode) {
        iframeContainer.parentNode.removeChild(iframeContainer);
      }
      tempVideoElements.forEach(vid => {
        if (vid.parentNode) vid.parentNode.removeChild(vid);
      });
    });

  } catch (error) {
    console.error("Boot: Critical error in project video preloading process:", error);
    if (iframeContainer.parentNode) {
      iframeContainer.parentNode.removeChild(iframeContainer);
    }
  }
}
// --- END NEW ---

// ==================================================
// END Boot Sequence Module
// ==================================================

// On DOMContentLoaded, fade in boot screen and remove pre-boot overlay
// (This is a visual polish step, not part of the main boot logic)
document.addEventListener("DOMContentLoaded", () => {
  const preBoot = document.getElementById("pre-boot-overlay");
  const bootScreen = document.getElementById("boot-screen");
  if (preBoot && bootScreen) {
    setTimeout(() => {
      preBoot.parentNode.removeChild(preBoot);
      bootScreen.classList.add("boot-fade-in");
    }, 1000);
  }
});
