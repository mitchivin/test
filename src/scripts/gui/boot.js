/**
 * @fileoverview Manages the boot sequence, login process, and session state for the Windows XP simulation.
 * @description This module is responsible for the visual boot animation, user login UI and logic,
 * session persistence (remembering if a user has logged in), and handling logoff/shutdown
 * requests initiated via the event bus. It orchestrates the transition from the boot screen,
 * to the login screen, and finally to the main desktop interface.
 *
 * Key Functionalities:
 * - Visual boot sequence animation.
 * - Login screen UI and interaction.
 * - Session state management (using `sessionStorage`).
 * - Logoff and shutdown dialogs and actions.
 * - Preloading of critical assets like sounds and system configuration.
 *
 * @module scripts/gui/boot
 * @file src/scripts/gui/boot.js
 * @see {@link module:scripts/utils/eventBus.EVENTS}
 */

import { showNetworkBalloon } from "./taskbar.js";
import { isMobileDevice } from "../utils/device.js";

/** @type {object | null} Cache for system assets loaded from `system.json`. */
let SYSTEM_ASSETS = null;
/** @type {HTMLAudioElement | null} Audio element for the notification balloon sound. Exported for use in other modules. */
export let balloonSound = null;

/**
 * Fetches system asset data (e.g., loading image path, sound paths) from `system.json`.
 * Implements a simple cache (`SYSTEM_ASSETS`) to avoid redundant fetches.
 * @async
 * @private
 * @returns {Promise<object>} A promise that resolves to the system assets object.
 *                            Returns an empty object on fetch failure.
 */
async function getSystemAssets() {
  // Return cached assets if available
  if (SYSTEM_ASSETS) return SYSTEM_ASSETS;
  try {
    const response = await fetch("./system.json");
    SYSTEM_ASSETS = await response.json();
    return SYSTEM_ASSETS;
  } catch (e) {
    // On failure, set cache to empty object to prevent repeated failed fetches
    SYSTEM_ASSETS = {};
    console.error("Failed to fetch system.json:", e);
    return SYSTEM_ASSETS;
  }
}

// ===== Boot Sequence Initialization =====
/**
 * Initializes the entire boot and login sequence for the application.
 * @description This function is the main entry point for starting the application's boot process.
 * It determines whether to show the full boot animation, skip to the login screen, or go directly
 * to the desktop based on session state (has the user logged in before?) or URL parameters (`forceBoot`).
 * It also handles preloading critical sounds and setting up event listeners for logoff/shutdown sequences.
 *
 * @param {EventBus} eventBus - The global event bus instance for inter-module communication.
 * @param {object} EVENTS - An object containing standardized event name constants from the event bus.
 * @param {Array<object>} projectsDataFromMain - Project data fetched in `main.js`, primarily passed through
 *                                               for preloading assets related to the projects app after login.
 * @returns {void} Does not return a value.
 * @see {@link module:scripts/utils/eventBus.EventBus}
 * @see {@link module:scripts/utils/eventBus.EVENTS}
 */
export function initBootSequence(eventBus, EVENTS, projectsDataFromMain) {
  // DOM element selections for UI manipulation
  const bootScreen = document.getElementById("boot-screen");
  const loginScreen = document.getElementById("login-screen");
  const desktop = document.querySelector(".desktop");
  const crtScanline = document.querySelector(".crt-scanline");
  const crtVignette = document.querySelector(".crt-vignette");
  const bootDelayMessage = document.getElementById("boot-delay-message");

  // URL parameters for forcing boot sequence
  const urlParams = new URLSearchParams(window.location.search);
  const forceBoot = urlParams.get("forceBoot") === "true";

  /** @type {number | null} Timer ID for the boot delay message, to allow clearing it. */
  let delayMessageTimer = null;

  // Logoff dialog elements
  const logoffDialog = document.getElementById("logoff-dialog-container");
  const logoffLogOffBtn = document.getElementById("logoff-log-off-btn");
  const logoffSwitchUserBtn = document.getElementById("logoff-switch-user-btn");
  const logoffCancelBtn = document.getElementById("logoff-cancel-btn");
  /** @type {number | null} Timer ID for the grayscale effect during logoff dialog. */
  let grayscaleTimeoutId = null;
  /** @type {string} Stores the type of dialog requested ('logOff' or 'shutDown'). */
  let currentDialogType = "logOff"; // Default to logOff

  // Preload login, logoff, and balloon sounds for instant playback when needed.
  const loginSound = new Audio("./assets/sounds/login.wav");
  const logoffSound = new Audio("./assets/sounds/logoff.wav");
  loginSound.load();
  logoffSound.load();

  balloonSound = new Audio("./assets/sounds/balloon.wav");
  balloonSound.load();

  // --- Boot Logic Decision ---
  // Determines whether to run the full boot sequence, skip to login, or go directly to desktop.
  if (forceBoot) {
    // If `forceBoot` URL parameter is true, clear session and start full boot sequence.
    const newUrl = window.location.pathname + window.location.hash; // Remove query params from URL
    history.replaceState({}, document.title, newUrl);
    sessionStorage.removeItem("logged_in");
    startBootSequence(projectsDataFromMain);
  } else {
    // Check if user has a previous logged-in session.
    const hasLoggedIn = sessionStorage.getItem("logged_in") === "true";
    if (hasLoggedIn) {
      // If already logged in, skip boot and login, go directly to desktop.
      skipBootSequence();
    } else {
      // Otherwise, start the full boot sequence.
      startBootSequence(projectsDataFromMain);
    }
  }

  /**
   * Bypasses the boot and login screens, displaying the desktop immediately.
   * @description Used when a user has a valid existing session (`sessionStorage.logged_in === "true"`).
   * It hides the boot and login screens and makes the desktop visible and interactive.
   * Clears any pending boot delay message timer.
   * @private
   * @returns {void} Nothing.
   */
  function skipBootSequence() {
    bootScreen.style.display = "none";
    loginScreen.style.display = "none";
    desktop.style.opacity = "1";
    desktop.style.pointerEvents = "auto";
    if (bootDelayMessage) bootDelayMessage.style.display = "none";
    // Clear the boot delay message timer if boot is skipped, as it's no longer relevant.
    if (delayMessageTimer) clearTimeout(delayMessageTimer);
  }

  /**
   * Initiates and manages the animated boot sequence.
   * @description This function controls the display of the boot screen, loading animation
   * (fetching and setting the boot logo from `system.json`), and a conditional "boot delay" message.
   * After a minimum boot duration, it orchestrates a fade-to-black transition before showing the login screen.
   * @param {Array<object>} projectsData - Project data, passed through to `attachLoginScreenHandlers`
   *                                      which then passes it to `handleLoginSuccess` for asset preloading.
   * @private
   * @returns {void} Nothing.
   */
  function startBootSequence(projectsData) {
    // Initial delay before starting the main boot screen display.
    setTimeout(async () => {
      // Ensure desktop is hidden and non-interactive during boot.
      desktop.style.opacity = "0";
      desktop.style.pointerEvents = "none";
      // Hide CRT effects during boot as they are part of the desktop view.
      if (crtScanline) crtScanline.style.display = "none";
      if (crtVignette) crtVignette.style.display = "none";
      if (!bootScreen) return;

      // Fetch system assets (e.g., boot logo path) from system.json.
      const system = await getSystemAssets();
      const bootLogoElement = document.getElementById("boot-logo");
      if (bootLogoElement && system && system.loading) {
        bootLogoElement.src = system.loading; // Set the boot logo image.
      }

      // Display the boot screen.
      bootScreen.style.display = "flex";
      bootScreen.style.opacity = "1";
      bootScreen.style.pointerEvents = "auto";

      // ===== Preload Music Player UI =====
      if (!isMobileDevice()) {
        let musicPlayerPreloadTimeout = null;
        let musicPlayerReadySubscription = null;

        // Listen for when WindowManager confirms the program is opening to get the element
        const musicPlayerOpeningSubscription = eventBus.subscribe(
          EVENTS.PROGRAM_OPENING,
          (data) => {
            if (data.programName === "musicPlayer" && data.windowElement) {
              if (musicPlayerOpeningSubscription)
                musicPlayerOpeningSubscription(); // Unsubscribe
            }
          },
        );

        eventBus.publish(EVENTS.PROGRAM_OPEN, { programName: "musicPlayer" });

        const closePreloadedMusicPlayer = () => {
          if (musicPlayerReadySubscription) musicPlayerReadySubscription();
          if (musicPlayerOpeningSubscription) musicPlayerOpeningSubscription();
          if (musicPlayerPreloadTimeout)
            clearTimeout(musicPlayerPreloadTimeout);
          eventBus.publish(EVENTS.PROGRAM_CLOSE_REQUESTED, {
            programId: "musicPlayer-window",
          });
        };

        musicPlayerReadySubscription = eventBus.subscribe(
          EVENTS.MUSIC_PLAYER_PRELOAD_READY,
          (data) => {
            if (data.programId === "musicPlayer") {
              closePreloadedMusicPlayer();
            }
          },
        );

        musicPlayerPreloadTimeout = setTimeout(() => {
          closePreloadedMusicPlayer();
        }, 7000); // 7-second timeout

        // ===== Preload Projects App UI =====
        let projectsAppPreloadTimeout = null;
        let projectsAppReadySubscription = null;

        eventBus.publish(EVENTS.PROGRAM_OPEN, { programName: "projects" });

        const closePreloadedProjectsApp = () => {
          if (projectsAppReadySubscription) projectsAppReadySubscription();
          if (projectsAppPreloadTimeout)
            clearTimeout(projectsAppPreloadTimeout);
          eventBus.publish(EVENTS.PROGRAM_CLOSE_REQUESTED, {
            programId: "projects-window",
          });
        };

        // The Projects app signals its readiness when WindowManager publishes PROGRAM_OPENED for it.
        // This happens after WindowManager receives the 'projects-ready' postMessage from the iframe.
        projectsAppReadySubscription = eventBus.subscribe(
          EVENTS.PROGRAM_OPENED,
          (data) => {
            if (data.programName === "projects") {
              closePreloadedProjectsApp();
            }
          },
        );

        projectsAppPreloadTimeout = setTimeout(() => {
          closePreloadedProjectsApp();
        }, 10000); // 10-second timeout for projects app (might be heavier)
      }

      // Set a timer to display a "boot delay" message if booting takes longer than expected.
      delayMessageTimer = setTimeout(() => {
        // Check if boot screen is still active before showing the message.
        if (bootScreen.style.display === "flex" && bootDelayMessage) {
          bootDelayMessage.style.opacity = "0"; // Start transparent for fade-in
          bootDelayMessage.style.transition = "opacity 0.5s ease-in-out";
          bootDelayMessage.style.display = "block";
          void bootDelayMessage.offsetWidth; // Trigger reflow for transition
          bootDelayMessage.style.opacity = "1";
        }
      }, 5000); // Display message after 5 seconds.

      const minBootTime = 5500; // Minimum duration for the boot screen to be visible (ms).
      // Schedule the transition from boot screen to login screen.
      setTimeout(() => {
        // Remove the boot delay message if it exists, as we are transitioning away.
        if (bootDelayMessage && bootDelayMessage.parentNode) {
          bootDelayMessage.parentNode.removeChild(bootDelayMessage);
        }
        clearTimeout(delayMessageTimer); // Clear the timer for showing the message.

        // Start fade-out of boot screen content (logo, progress bar).
        bootScreen.classList.remove("boot-fade-in"); // Assumes boot-fade-in handles visual elements.
        setTimeout(() => {
          // Use a full-screen overlay to fade to black smoothly before showing login screen.
          const fadeoutOverlay = document.getElementById(
            "boot-fadeout-overlay",
          );
          if (fadeoutOverlay) {
            fadeoutOverlay.style.display = "block";
            void fadeoutOverlay.offsetWidth; // Trigger reflow
            fadeoutOverlay.style.transition = "opacity 0.5s";
            fadeoutOverlay.style.opacity = "1"; // Fade in the black overlay.

            // After fade to black, hide boot screen and show login screen.
            setTimeout(() => {
              bootScreen.style.display = "none";
              loginScreen.style.display = "flex";
              loginScreen.style.opacity = "1";
              loginScreen.style.pointerEvents = "auto";
              const loginContent = loginScreen.querySelector(".login-screen");
              if (loginContent) loginContent.style.opacity = "1"; // Ensure login content is visible.

              // Attach event handlers to the login screen elements.
              attachLoginScreenHandlers(projectsData);

              // Fade out the black overlay to reveal login screen.
              fadeoutOverlay.style.opacity = "0";

              // Final cleanup of boot delay message and its timer, just in case.
              if (bootDelayMessage && bootDelayMessage.parentNode) {
                bootDelayMessage.parentNode.removeChild(bootDelayMessage);
              }
              if (delayMessageTimer) {
                clearTimeout(delayMessageTimer);
                delayMessageTimer = null;
              }
              // Hide the fadeout overlay after its transition.
              setTimeout(() => {
                fadeoutOverlay.style.display = "none";
              }, 500); // Matches overlay fade-out duration.
            }, 1150); // Duration of black screen (0.15s fade-in + 1s black screen).
          }
        }, 250); // Delay after boot content fade starts, before black overlay appears.
      }, minBootTime - 1400); // Start fadeout process before minBootTime fully elapses.
    }, 1000); // Initial delay for pre-boot overlay (if any visual polish is applied there).
  }

  // ===== Login and Session Management =====
  /**
   * Handles the UI transitions and actions after a successful login.
   * @description Fades out the login UI elements, briefly displays a "Welcome" message,
   * and then transitions to show the main desktop. Plays a login sound.
   * Updates session storage to mark the user as logged in.
   * Initializes network balloon tooltip and CRT scanline effect on the desktop.
   * Also triggers preloading of specific app assets (Projects, About, Resume) on mobile.
   * @param {Array<object>} projectsData - Project data, primarily used here for preloading
   *                                      assets of the Projects app on mobile devices after login.
   * @private
   * @returns {void} Nothing.
   */
  function handleLoginSuccess(projectsData) {
    const loginContent = loginScreen.querySelector(".login-screen");
    const welcomeMsg = loginScreen.querySelector(".welcome-message");

    // Elements to fade out on the login screen.
    const fadeTargets = [
      loginContent.querySelector(".back-gradient"), // User profile / login button area
      loginContent.querySelector(".turn-off"), // "Turn off computer" text
      loginContent.querySelector(".right-bottom"), // Shutdown icon container
      loginContent.querySelector(".xp-logo-image"),
      loginContent.querySelector(".left-text"), // "To begin, click your user name"
      loginContent.querySelector(".login-separator.mobile-only"),
    ];
    // Fade out login screen elements.
    fadeTargets.forEach((el) => {
      if (el) {
        el.style.transition = "opacity 0.15s";
        el.style.opacity = "0";
      }
    });

    // After fade-out, hide elements and then show Welcome message.
    setTimeout(() => {
      fadeTargets.forEach((el) => {
        if (el) el.style.display = "none";
      });
      // Display "Welcome" message.
      setTimeout(() => {
        welcomeMsg.style.display = "block";
        setTimeout(() => {
          welcomeMsg.classList.add("visible"); // Add class for fade-in transition of welcome message.
        }, 10); // Small delay for reflow.
      }, 500); // Delay before welcome message appears.

      // After Welcome message duration, transition to desktop.
      setTimeout(() => {
        welcomeMsg.classList.remove("visible"); // Fade out welcome message.
        loginScreen.style.display = "none";
        loginScreen.style.pointerEvents = "none";
        loginScreen.style.opacity = "0";

        // Show desktop.
        desktop.style.opacity = "1";
        desktop.style.pointerEvents = "auto";
        if (crtScanline) crtScanline.style.display = "block";
        if (crtVignette) crtVignette.style.display = "block";
        document.dispatchEvent(new CustomEvent("reinitScanline")); // Trigger scanline reinitialization if needed.

        // Play login sound.
        try {
          loginSound.currentTime = 0;
          loginSound.play();
        } catch (e) {
          console.warn("Login sound playback failed:", e);
        }

        // Set session storage to indicate user is logged in.
        sessionStorage.setItem("logged_in", "true");

        // Show network connection balloon tooltip after a delay.
        setTimeout(() => {
          if (
            typeof showNetworkBalloon === "function" &&
            !document.getElementById("balloon-root") // Check if balloon isn't already shown.
          ) {
            showNetworkBalloon();
          }
        }, 3000);

        // Block logoff button for a short period after login to prevent accidental immediate logoff.
        window._logoffEnableTime = Date.now() + 5000; // Store timestamp for enabling logoff.
      }, 2500); // Duration welcome message is visible.
    }, 150); // Delay after login elements fade, before welcome message sequence.

    // --- Mobile-specific asset preloading ---
    // On mobile devices, preload all project assets after the user interacts (logs in).
    // This is to work around autoplay restrictions and improve perceived performance.
    if (/iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent)) {
      if (projectsData && projectsData.length > 0) {
        const assetSet = new Set(); // Set to store unique image asset paths.
        const videoSet = new Set(); // Set to store unique video asset paths.

        // Collect all asset paths from projectsData.
        projectsData.forEach((project) => {
          [
            "src",
            "fullVideoSrc",
            "poster",
            "posterMobile",
            "srcMobile",
          ].forEach((key) => {
            if (project[key]) assetSet.add(project[key]);
            if (project[key] && project[key].endsWith(".mp4"))
              videoSet.add(project[key]);
          });
          // Also check 'images' array which can contain strings or objects.
          if (Array.isArray(project.images)) {
            project.images.forEach((img) => {
              if (typeof img === "string") {
                assetSet.add(img);
                if (img.endsWith(".mp4")) videoSet.add(img);
              } else if (typeof img === "object" && img !== null) {
                ["src", "poster", "posterMobile", "srcMobile"].forEach(
                  (key) => {
                    if (img[key]) assetSet.add(img[key]);
                    if (img[key] && img[key].endsWith(".mp4"))
                      videoSet.add(img[key]);
                  },
                );
              }
            });
          }
        });

        // Preload images by creating new Image objects.
        assetSet.forEach((assetPath) => {
          const ext = assetPath.split(".").pop().trim().toLowerCase();
          if (
            ext === "webp" ||
            ext === "jpg" ||
            ext === "jpeg" ||
            ext === "png"
          ) {
            const img = new window.Image();
            img.src = assetPath;
          }
        });

        // Create a hidden video pool for mobile to encourage preloading/caching.
        const videoPool = {};
        let poolContainer = document.getElementById("mobile-video-pool");
        if (!poolContainer) {
          // Create container if it doesn't exist.
          poolContainer = document.createElement("div");
          poolContainer.id = "mobile-video-pool";
          poolContainer.style.display = "none"; // Hidden from view.
          document.body.appendChild(poolContainer);
        }
        videoSet.forEach((videoPath) => {
          const vid = document.createElement("video");
          vid.src = videoPath;
          vid.preload = "auto"; // Encourage browser to load metadata/some data.
          vid.muted = true;
          vid.setAttribute("playsinline", "");
          vid.setAttribute("disablePictureInPicture", "");
          vid.load(); // Explicitly call load.
          poolContainer.appendChild(vid);
          videoPool[videoPath] = vid; // Store reference if needed later.
        });
        window.__MOBILE_VIDEO_POOL = videoPool; // Expose pool globally if needed for debugging or direct access.
      }
    }

    // --- Preload critical assets for specific applications (About, Resume) and Toolbar icons ---
    // This helps ensure these common/important assets are available quickly when these apps/UI are accessed.
    const appCriticalAssets = [
      // Resume App
      { path: "./assets/apps/resume/resume.webp", type: "image" },
      { path: "./assets/apps/resume/resumeMitchIvin.pdf", type: "document" }, // PDF document
      // About App
      { path: "./assets/gui/bgs/aboutbg.webp", type: "image" },
      { path: "./assets/apps/about/pullup-alt.webp", type: "image" },
      { path: "./assets/apps/about/pullup.webp", type: "image" },
      { path: "./assets/apps/about/skill1.webp", type: "image" },
      { path: "./assets/apps/about/skill2.webp", type: "image" },
      { path: "./assets/apps/about/skill3.webp", type: "image" },
      { path: "./assets/apps/about/skill4.webp", type: "image" },
      { path: "./assets/apps/about/skill5.webp", type: "image" },
      { path: "./assets/apps/about/p1.webp", type: "image" },
      { path: "./assets/apps/about/p2.webp", type: "image" },
      { path: "./assets/apps/about/p3.webp", type: "image" },
      { path: "./assets/apps/about/p4.webp", type: "image" },
      { path: "./assets/apps/about/p5.webp", type: "image" },
      // Toolbar Icons (Common UI elements)
      { path: "./assets/gui/toolbar/barlogo.webp", type: "image" },
      { path: "./assets/gui/toolbar/back.webp", type: "image" },
      { path: "./assets/gui/toolbar/copy.webp", type: "image" },
      { path: "./assets/gui/toolbar/cut.webp", type: "image" },
      { path: "./assets/gui/toolbar/delete.webp", type: "image" },
      { path: "./assets/gui/toolbar/forward.webp", type: "image" },
      { path: "./assets/gui/toolbar/go.webp", type: "image" },
      { path: "./assets/gui/toolbar/home.webp", type: "image" },
      { path: "./assets/gui/toolbar/new.webp", type: "image" },
      { path: "./assets/gui/toolbar/paste.webp", type: "image" },
      { path: "./assets/gui/toolbar/print.webp", type: "image" },
      { path: "./assets/gui/toolbar/save.webp", type: "image" },
      { path: "./assets/gui/toolbar/search.webp", type: "image" },
      { path: "./assets/gui/toolbar/send.webp", type: "image" },
      { path: "./assets/gui/toolbar/tooldropdown.webp", type: "image" },
      { path: "./assets/gui/toolbar/up.webp", type: "image" },
      { path: "./assets/gui/toolbar/views.webp", type: "image" },
      { path: "./assets/gui/toolbar/desc.webp", type: "image" },
      // Music Player App Songs
      { path: "./assets/apps/musicPlayer/audio/song1.mp3", type: "audio" },
      { path: "./assets/apps/musicPlayer/audio/song2.mp3", type: "audio" },
      { path: "./assets/apps/musicPlayer/audio/song3.mp3", type: "audio" },
      // Music Player App Album Art
      { path: "./assets/apps/musicPlayer/art/album1.webp", type: "image" },
      { path: "./assets/apps/musicPlayer/art/album2.webp", type: "image" },
      { path: "./assets/apps/musicPlayer/art/album3.webp", type: "image" },
    ];

    appCriticalAssets.forEach((asset) => {
      const link = document.createElement("link");
      link.href = asset.path;
      link.rel = "";
      link.as = "";

      if (asset.type === "image") {
        link.rel = "preload";
        link.as = "image";
      } else if (asset.type === "document") {
        link.rel = "preload";
        link.as = "fetch";
        link.crossOrigin = "anonymous";
      } else if (asset.type === "audio") {
        link.rel = "preload";
        link.as = "audio";
      }

      if (link.rel && link.as) {
        document.head.appendChild(link);
      }
    });
  }

  // --- Event Listener for Shutdown Requests from Login Iframe (if applicable) ---
  // This handles messages posted from an iframe, potentially used for a separate login module.
  window.addEventListener("message", (event) => {
    // Check for a specific message type indicating a shutdown request.
    if (event.data?.type === "shutdownRequest") {
      if (eventBus && EVENTS) {
        // Publish a shutdown request event on the main event bus.
        eventBus.publish(EVENTS.SHUTDOWN_REQUESTED);
      }
    }
  });

  // --- Logoff and Shutdown Dialog Management ---
  // Ensure eventBus and EVENTS are available before setting up subscribers.
  if (!eventBus || !EVENTS) return;

  // Listen for requests to show the logoff confirmation dialog.
  eventBus.subscribe(EVENTS.LOG_OFF_CONFIRMATION_REQUESTED, (data) => {
    currentDialogType = data?.dialogType || "logOff"; // Store the type from payload, default to logOff
    showLogoffDialog();
  });

  /**
   * Displays the logoff confirmation dialog.
   * @description Makes the logoff dialog visible with a fade-in animation.
   * Updates dialog text and button labels based on `currentDialogType`.
   * Attaches event listeners to its buttons.
   * Manages button states and applies a screen grayscale effect.
   * @private
   * @returns {void} Nothing.
   */
  function showLogoffDialog() {
    if (!logoffDialog) return;

    const dialogHeaderText = logoffDialog.querySelector(
      ".logoff-dialog-header-text",
    );
    const primaryActionButton = logoffDialog.querySelector(
      "#logoff-log-off-btn",
    );
    const primaryActionIcon = primaryActionButton?.querySelector("img");
    const primaryActionText = primaryActionButton?.querySelector("span");

    // Configure the primary action button (Log Off / Shut Down)
    if (currentDialogType === "shutDown") {
      if (dialogHeaderText)
        dialogHeaderText.textContent = "Turn off MitchIvin XP";
      if (primaryActionText) primaryActionText.textContent = "Shut Down";
      if (primaryActionIcon)
        primaryActionIcon.src = "assets/gui/start-menu/shutdown.webp";
      if (primaryActionButton) {
        primaryActionButton.style.opacity = "0.6"; // Visually disabled
        primaryActionButton.style.pointerEvents = "none"; // NOT CLICKABLE
      }
    } else {
      // Default to "logOff" -- this button will be clickable and its state managed by timed logic
      if (dialogHeaderText)
        dialogHeaderText.textContent = "Log Off MitchIvin XP";
      if (primaryActionText) primaryActionText.textContent = "Log Off";
      if (primaryActionIcon)
        primaryActionIcon.src = "assets/gui/start-menu/logoff.webp";
      if (primaryActionButton) {
        // Opacity and pointerEvents for Log Off are handled by the timed logic below
        primaryActionButton.style.opacity = ""; // Default to normal opacity initially
        primaryActionButton.style.pointerEvents = ""; // Default to clickable initially
      }
    }

    logoffDialog.classList.remove("logoff-dialog-hidden");
    logoffDialog.classList.add("visible");

    // Ensure the Restart button (logoffSwitchUserBtn) appears enabled and is clickable.
    if (logoffSwitchUserBtn) {
      logoffSwitchUserBtn.style.opacity = ""; // Normal opacity (enabled look)
      logoffSwitchUserBtn.style.pointerEvents = ""; // Explicitly allow pointer events.
      logoffSwitchUserBtn.classList.remove("disabled");
    }

    // Timed lockout logic, primarily for the "Log Off" button state.
    // If the dialog is for "Shut Down", the primary button is already set to non-clickable above.
    if (primaryActionButton && currentDialogType === "logOff") {
      const now = Date.now();
      const enableTime = window._logoffEnableTime || 0;
      if (now < enableTime) {
        primaryActionButton.classList.add("logoff-button-timed-disable");
        primaryActionButton.style.pointerEvents = "none";
        primaryActionButton.style.opacity = "0.6";

        setTimeout(() => {
          if (
            primaryActionButton &&
            logoffDialog.classList.contains("visible") &&
            currentDialogType === "logOff"
          ) {
            primaryActionButton.classList.remove("logoff-button-timed-disable");
            primaryActionButton.style.pointerEvents = "";
            primaryActionButton.style.opacity = "";
          }
        }, enableTime - now);
      } else {
        // Not within lockout, for "logOff" button
        primaryActionButton.classList.remove("logoff-button-timed-disable");
        primaryActionButton.style.pointerEvents = "";
        primaryActionButton.style.opacity = "";
      }
    }

    // Delay before applying grayscale effect to the screen for a more polished feel.
    clearTimeout(grayscaleTimeoutId); // Clear any existing grayscale timer.
    grayscaleTimeoutId = setTimeout(() => {
      document.body.classList.add("screen-grayscale-active");
    }, 700); // 700ms delay.
  }

  /**
   * Hides the logoff confirmation dialog.
   * @description Removes the dialog from view with a fade-out animation and
   * removes the screen grayscale effect. Clears the grayscale timer.
   * @private
   * @returns {void} Nothing.
   */
  function hideLogoffDialog() {
    if (!logoffDialog) return;
    logoffDialog.classList.remove("visible"); // Trigger fade-out/hide animation.
    logoffDialog.classList.add("logoff-dialog-hidden"); // Ensure display:none after transition (if CSS handles this).

    // Remove screen grayscale effect.
    document.body.classList.remove("screen-grayscale-active");
    clearTimeout(grayscaleTimeoutId); // Clear grayscale timer if dialog is hidden before it fires.
  }

  // Attach event listeners for logoff dialog buttons.
  if (logoffLogOffBtn) {
    // Remove existing listener to prevent multiple attachments if showLogoffDialog is called multiple times
    // A more robust way would be to use a named function and remove it specifically,
    // but for simplicity here, we'll rely on the fact that boot.js initBootSequence runs once.
    // If issues arise, this is an area to refine.
    // For now, we assume listeners are added once.

    const logOffAction = (event) => {
      event.stopPropagation();
      hideLogoffDialog();
      if (currentDialogType === "shutDown") {
        // Perform shutdown:
        sessionStorage.removeItem("logged_in");
        window.location.reload();
      } else {
        // Perform log off (go to login screen):
        eventBus.publish(EVENTS.LOG_OFF_REQUESTED);
      }
    };
    // It's important to ensure we don't add multiple listeners if this part of code can be re-entered.
    // A simple way for now is to check if a handler is already attached.
    if (!logoffLogOffBtn._logOffActionAttached) {
      logoffLogOffBtn.addEventListener("click", logOffAction);
      logoffLogOffBtn._logOffActionAttached = true;
    }
  }

  if (logoffSwitchUserBtn) {
    const restartAction = (event) => {
      event.stopPropagation();
      hideLogoffDialog();
      sessionStorage.removeItem("logged_in");
      window.location.reload();
    };
    // Similar check for the restart button
    if (!logoffSwitchUserBtn._restartActionAttached) {
      logoffSwitchUserBtn.addEventListener("click", restartAction);
      logoffSwitchUserBtn._restartActionAttached = true;
    }
  }

  if (logoffCancelBtn) {
    const cancelAction = () => {
      hideLogoffDialog();
    };
    if (!logoffCancelBtn._cancelActionAttached) {
      logoffCancelBtn.addEventListener("click", cancelAction);
      logoffCancelBtn._cancelActionAttached = true;
    }
  }
  // Ensure Escape key also closes the logoff dialog if it's visible.
  const escapeKeyHandler = (event) => {
    if (
      event.key === "Escape" &&
      logoffDialog &&
      logoffDialog.classList.contains("visible")
    ) {
      hideLogoffDialog();
    }
  };
  document.addEventListener("keydown", escapeKeyHandler);
  // End Logoff Dialog Management

  // --- Event Listener: Log Off Action ---
  // Handles the actual logoff process once confirmed or directly requested via event bus.
  eventBus.subscribe(EVENTS.LOG_OFF_REQUESTED, () => {
    // Play logoff sound.
    try {
      logoffSound.currentTime = 0;
      logoffSound.play();
    } catch (e) {
      console.warn("Logoff sound playback failed:", e);
    }

    // Hide any active network balloon tooltip immediately upon logoff.
    // Assumes `hideBalloon` function exists and is globally accessible or imported.
    if (typeof hideBalloon === "function") {
      // `hideBalloon` is not defined in this file, assumes it's global or needs import.
      // hideBalloon(true); // true for instant removal. This line is commented out as hideBalloon is not defined here.
      // To make this work, hideBalloon would need to be imported or defined in this scope.
      // For now, we assume it might be handled by taskbar.js directly upon desktop becoming hidden.
    }

    // Reset UI: Show login screen, hide desktop.
    loginScreen.style.display = "flex";
    loginScreen.style.opacity = "1";
    loginScreen.style.pointerEvents = "auto";
    const loginContent = loginScreen.querySelector(".login-screen");
    if (loginContent) {
      loginContent.style.opacity = "1";
      // Ensure all parts of login screen that might have been hidden during login success are made visible again.
      const interactiveLoginElements = [
        loginContent.querySelector(".back-gradient"),
        loginContent.querySelector(".turn-off"),
        loginContent.querySelector(".right-bottom"),
        loginContent.querySelector(".xp-logo-image"),
        loginContent.querySelector(".left-text"),
        loginContent.querySelector(".login-separator.mobile-only"),
        loginScreen.querySelector(".welcome-message"), // Also hide welcome message explicitly.
      ];
      interactiveLoginElements.forEach((el) => {
        if (el) {
          el.style.display = ""; // Reset display (browser default or original CSS value).
          el.style.opacity = "1"; // Reset opacity.
          if (el.classList.contains("welcome-message")) {
            el.classList.remove("visible"); // Remove visibility class.
            el.style.display = "none"; // Specifically hide welcome message container.
          }
        }
      });
    }
    desktop.style.opacity = "0";
    desktop.style.pointerEvents = "none";

    // Clear session state and reset CRT/Desktop visual states.
    sessionStorage.removeItem("logged_in"); // Mark as logged out.
    if (crtScanline) crtScanline.style.display = "none";
    if (crtVignette) crtVignette.style.display = "none";
    eventBus.publish(EVENTS.STARTMENU_CLOSE_REQUEST); // Close start menu if it was open.

    // Re-attach handlers to login screen elements as it's now the active interface.
    // Pass projectsDataFromMain for potential use in login success asset preloading if user logs back in.
    attachLoginScreenHandlers(projectsDataFromMain);
  });

  /**
   * Attaches event listeners to the interactive elements on the login screen.
   * @description Sets up click listeners for the main "Log On" button (profile element / `.back-gradient`)
   * and the "Turn off computer" icon.
   * On successful login (clicking profile), it calls `handleLoginSuccess`.
   * Clicking "Turn off computer" publishes a `SHUTDOWN_REQUESTED` event via the event bus.
   * Uses internal flags (`_loginHandlerAttached`, `_shutdownHandlerAttached`) on the elements
   * themselves to prevent attaching listeners multiple times if this function is called again (e.g., after logoff).
   * @param {Array<object>} projectsData - Project data, passed through to `handleLoginSuccess` for asset preloading.
   * @private
   * @returns {void} Nothing.
   */
  function attachLoginScreenHandlers(projectsData) {
    const profileElement = document.querySelector(".back-gradient"); // This is the main login click area.
    // Check if handler is already attached using a custom property on the element.
    if (profileElement && !profileElement._loginHandlerAttached) {
      profileElement.addEventListener("click", function () {
        profileElement.classList.add("active"); // Visual feedback on click.
        handleLoginSuccess(projectsData);
      });
      profileElement._loginHandlerAttached = true; // Mark handler as attached.
    }

    const shutdownIcon = document.getElementById("shutdown-icon");
    // Check if handler is already attached.
    if (shutdownIcon && !shutdownIcon._shutdownHandlerAttached) {
      shutdownIcon.addEventListener("click", () => {
        if (eventBus && EVENTS) {
          // Publish confirmation request for shutdown dialog when icon is clicked
          eventBus.publish(EVENTS.LOG_OFF_CONFIRMATION_REQUESTED, {
            dialogType: "shutDown",
          });
        }
      });
      shutdownIcon._shutdownHandlerAttached = true; // Mark handler as attached.
    }
  }
}

// ===== DOMContentLoaded Initialization =====
// Performs initial setup once the basic DOM structure is ready.
// This includes fetching system assets for logos/icons and handling the pre-boot visual overlay.
document.addEventListener("DOMContentLoaded", async () => {
  // Fetch system assets like paths to logos and icons.
  const system = await getSystemAssets();

  // Set boot screen loading spinner/logo.
  const bootLogo = document.getElementById("boot-logo");
  if (bootLogo && system.loading) bootLogo.src = system.loading;

  // Set login screen XP logo (potentially same as boot logo).
  document.querySelectorAll(".xp-logo-image").forEach((img) => {
    if (system.loading) img.src = system.loading;
  });

  // Set login screen user icon.
  document.querySelectorAll(".login-screen .user img").forEach((img) => {
    if (system.userIcon) img.src = system.userIcon;
  });

  // Set login screen name from info.json (personalization).
  try {
    const response = await fetch("./info.json");
    const info = await response.json();
    const name = info?.contact?.name || "Mitch Ivin"; // Default name if not found.
    // Update name in user profile display.
    document.querySelectorAll(".login-screen .name").forEach((span) => {
      span.textContent = name;
    });
    // Update only the name part in the login instruction text.
    document.querySelectorAll(".login-instruction-name").forEach((span) => {
      span.textContent = name;
    });
  } catch (e) {
    console.error(
      "Failed to fetch or parse info.json for login screen name:",
      e,
    );
  }

  // Visual polish: Fade out pre-boot overlay and fade in boot screen content.
  const preBoot = document.getElementById("pre-boot-overlay");
  const bootScreen = document.getElementById("boot-screen");
  if (preBoot && bootScreen) {
    setTimeout(() => {
      // Remove the pre-boot overlay once main content is ready to show.
      if (preBoot.parentNode) preBoot.parentNode.removeChild(preBoot);
      // Add class to trigger fade-in of boot screen elements (logo, progress bar).
      bootScreen.classList.add("boot-fade-in");
    }, 1000); // Delay to allow initial rendering and prevent flash of unstyled content.
  }
});
