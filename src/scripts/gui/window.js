/**
 * window.js — Window Manager for Windows XP Simulation
 *
 * Handles all window operations, including:
 * - Window creation, focus, minimize, maximize, close, drag, and cascade
 * - Taskbar and event bus integration
 * - Dynamic content and toolbar/address bar logic
 *
 * Usage:
 *   import WindowManager from './window.js';
 *   const windowManager = new WindowManager(eventBus);
 *
 * Edge Cases:
 *   - If required DOM containers are missing, window creation will fail.
 *   - If program registry is missing entries, unknown apps cannot be opened.
 *
 * @module window
 */
import programData from "../utils/programRegistry.js";
import { EVENTS } from "../utils/eventBus.js";
import { createMenuBar, createToolbar, createAddressBar } from "./windowBars.js";
import { isMobileDevice } from "../utils/device.js";

const TASKBAR_HEIGHT = 30; // Define constant taskbar height

// ==================================================
//  Window Manager Module for Windows XP Simulation
// ==================================================

/**
 * WindowTemplates provides templates for different window types (iframe, error, empty).
 *
 * @class
 * @example
 * const content = WindowTemplates.getTemplate('iframe-standard', programConfig);
 */
class WindowTemplates {
  /**
   * Gets a template container for windows
   * @param {string} [templateName] - Optional template type identifier
   * @param {object} [programConfig] - Optional program configuration object
   * @returns {HTMLElement} DOM element containing the window content
   */
  static getTemplate(templateName, programConfig) {
    if (templateName === "iframe-standard" && programConfig?.appPath) {
      // Pass programConfig to createIframeContainer
      return this.createIframeContainer(
        programConfig.appPath,
        programConfig.id,
        programConfig, // Pass the whole config object
      );
    }
    // Create error container for invalid templates or non-iframe types
    const content = document.createElement("div");
    content.className = "window-body";
    const errorMsg = !templateName
      ? "Error: Window template not specified or invalid configuration."
      : `Error: Template '${templateName}' not found or missing appPath.`;
    content.innerHTML = `<p style="padding:10px;">${errorMsg}</p>`;
    return content;
  }

  static createIframeContainer(appPath, windowId, programConfig) {
    const container = document.createElement("div");
    container.className = "window-body";

    // --- Dynamically Generate MenuBar based on programConfig ---
    let menuBarContainer = null;
    if (programConfig?.menuBarConfig?.items) {
      let parentWindowElement = container.closest(".window, .app-window");
      menuBarContainer = createMenuBar(
        programConfig.menuBarConfig,
        windowId,
        parentWindowElement,
      );
      if (menuBarContainer) container.appendChild(menuBarContainer);
    }

    // --- Generate Toolbar (if config exists) ---
    let toolbarWrapper = null;
    if (programConfig?.toolbarConfig?.buttons) {
      toolbarWrapper = createToolbar(
        programConfig.toolbarConfig,
        windowId,
        programConfig && programConfig.id === "my-pictures-window"
      );
    }

    // --- Create Address Bar (if config exists) ---
    let addressBar = null;
    if (programConfig?.addressBarConfig?.enabled) {
      addressBar = createAddressBar(programConfig.addressBarConfig);
    }

    // --- Create iframe container and iframe ---
    const iframeContainer = document.createElement("div");
    iframeContainer.className = "iframe-container";
    iframeContainer.style.position = "relative";
    const iframe = document.createElement("iframe");

    // MODIFICATION FOR DEFERRED LOADING OF PROJECTS APP
    if (programConfig && programConfig.id === 'internet') { // 'internet' is the ID for My Projects
        iframe.src = 'about:blank';
        iframe.dataset.realSrc = appPath; // Store the actual path
        console.log(`[WINDOW.JS] My Projects iframe (${windowId}) initially set to about:blank. Real src: ${appPath}`);
    } else {
        iframe.src = appPath;
    }
    iframe.title = `${windowId}-content`;
    iframe.name = windowId; // Set unique name for identification

    const attrs = {
      frameborder: "0",
      width: "100%",
      height: "100%",
      sandbox:
        "allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads",
      allow: "autoplay", // Added for mobile video autoplay consistency
      loading: "eager"     // Added as per suggestion
    };
    for (const [attr, value] of Object.entries(attrs))
      iframe.setAttribute(attr, value);

    // Send initial maximized/unmaximized state to iframe on load
    // This onload will fire when src is set, either initially or when changed from about:blank
    iframe.onload = () => {
      if (iframe.contentWindow) {
        console.log(`[WINDOW.JS] iframe ${iframe.name} (src: ${iframe.src}) loaded. Sending window state.`);
        const appWindow = iframe.closest('.app-window');
        if (appWindow) {
          if (appWindow.classList.contains('maximized')) {
            iframe.contentWindow.postMessage({ type: "window:maximized" }, "*");
          } else {
            iframe.contentWindow.postMessage({ type: "window:unmaximized" }, "*");
          }
        }
      }
    };

    iframeContainer.appendChild(iframe);

    // --- Append in correct order: MenuBar, Toolbar, AddressBar, IframeContainer ---
    if (toolbarWrapper) container.appendChild(toolbarWrapper);
    if (addressBar) container.appendChild(addressBar);
    container.appendChild(iframeContainer);

    return container;
  }
}

/**
 * WindowManager handles all window operations, stacking, drag, focus, and taskbar integration.
 *
 * @class
 * @example
 * import WindowManager from './window.js';
 * const windowManager = new WindowManager(eventBus);
 */
export default class WindowManager {
  /**
   * Create a new WindowManager instance.
   * @param {EventBus} eventBus - The event bus instance for communication.
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.windows = {};
    this.activeWindow = null;
    this.taskbarItems = {};
    this.windowCount = 0;
    this.programData = programData;
    this.preloadedAppIframes = {}; // NEW: To store hidden iframes used for preloading
    this.baseZIndex =
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--z-window",
        ),
      ) || 100;
    this.windowsContainer = document.getElementById("windows-container");
    this.taskbarPrograms = document.querySelector(".taskbar-programs"); // Cache taskbar-programs
    this.zIndexStack = []; // Array to track window stacking order (IDs)
    // --- Multi-column cascade state ---
    this.cascadeColumn = 0;
    this.cascadeRow = 0;

    this.lastInteractionTimes = {}; // To store timestamps for throttling

    this._setupGlobalHandlers();
    this._subscribeToEvents();

    // Listen for messages from iframes
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'set-home-enabled') {
            const homeButton = document.querySelector('.toolbar-button.home');
            if (homeButton) {
                if (event.data.enabled) {
                    homeButton.classList.remove('disabled');
                } else {
                    homeButton.classList.add('disabled');
                }
            }
        }
        
        if (event.data && event.data.type === 'lightbox-state') {
            const projectsWindow = this.windows['internet-window'];
            let viewDescBtn, backBtn, forwardBtn, externalLinkBtn;

            if (projectsWindow) {
                 viewDescBtn = projectsWindow.querySelector('.toolbar-button.view-description');
                 backBtn = projectsWindow.querySelector('.toolbar-button.previous');
                 forwardBtn = projectsWindow.querySelector('.toolbar-button.next');
                 externalLinkBtn = projectsWindow.querySelector('.toolbar-button.viewExternalLink'); 
            } else { 
                viewDescBtn = document.querySelector('.toolbar-button.view-description');
                backBtn = document.querySelector('.toolbar-button.previous');
                forwardBtn = document.querySelector('.toolbar-button.next');
                externalLinkBtn = document.querySelector('.toolbar-button.viewExternalLink');
            }

            if (viewDescBtn) {
                viewDescBtn.classList.toggle('disabled', !event.data.open);
                const textSpan = viewDescBtn.querySelector('span');
                // Always set initial text to 'Show more' if not open
                if (event.data.open) {
                    if (textSpan) textSpan.textContent = 'Show less';
                    viewDescBtn.setAttribute('aria-label', 'Show less');
                } else {
                    if (textSpan) textSpan.textContent = 'Show more';
                    viewDescBtn.setAttribute('aria-label', 'Show more');
                }
            }
            if (backBtn) {
                backBtn.classList.toggle('disabled', !event.data.open);
            }
            if (forwardBtn) {
                forwardBtn.classList.toggle('disabled', !event.data.open);
            }
            
            if (externalLinkBtn) {
                const iconImg = externalLinkBtn.querySelector('img');
                const textSpan = externalLinkBtn.querySelector('span');

                if (event.data.open && event.data.linkType && event.data.linkUrl) {
                    externalLinkBtn.classList.remove('disabled');
                    externalLinkBtn.dataset.urlToOpen = event.data.linkUrl; 

                    switch (event.data.linkType) {
                        case 'instagram':
                            if (iconImg) iconImg.src = './assets/gui/start-menu/instagram.webp';
                            if (textSpan) textSpan.textContent = 'View on Instagram';
                            break;
                        case 'behance':
                            if (iconImg) iconImg.src = './assets/gui/start-menu/behance.webp';
                            if (textSpan) textSpan.textContent = 'View on Behance';
                            break;
                        case 'github':
                            if (iconImg) iconImg.src = './assets/gui/start-menu/github.webp';
                            if (textSpan) textSpan.textContent = 'View on GitHub';
                            break;
                        default: // Fallback to Instagram or a generic state if linkType is unknown
                            if (iconImg) iconImg.src = './assets/gui/start-menu/instagram.webp';
                            if (textSpan) textSpan.textContent = 'View Link'; 
                            break;
                    }
                } else {
                    externalLinkBtn.classList.add('disabled');
                    delete externalLinkBtn.dataset.urlToOpen; 
                    // Reset to default (Instagram) appearance when no link or lightbox closed
                    if (iconImg) iconImg.src = './assets/gui/start-menu/instagram.webp';
                    if (textSpan) textSpan.textContent = 'View on Instagram';
                }
            }
        }

        if (event.data && event.data.type === 'description-state') {
            let sourceWindowElement = null;
            for (const windowId in this.windows) {
                const winElement = this.windows[windowId];
                const iframe = winElement.querySelector('iframe');
                if (iframe && iframe.contentWindow === event.source) {
                    sourceWindowElement = winElement;
                    break;
                }
            }

            if (sourceWindowElement && sourceWindowElement.id === 'internet-window') {
                const viewDescButton = sourceWindowElement.querySelector('.toolbar-button.view-description');
                if (viewDescButton) {
                    const textSpan = viewDescButton.querySelector('span');
                    if (event.data.open) {
                        if (textSpan) textSpan.textContent = 'Show less';
                        viewDescButton.setAttribute('aria-label', 'Show less');
                    } else {
                        if (textSpan) textSpan.textContent = 'Show more';
                        viewDescButton.setAttribute('aria-label', 'Show more');
                    }
                }
            }
        }

        if (event.data && event.data.type === 'throttle-toolbar' && event.data.key === 'view-description') {
            const projectsWindow = this.windows['internet-window'];
            let viewDescBtn;
            if (projectsWindow) {
                viewDescBtn = projectsWindow.querySelector('.toolbar-button.view-description');
            } else {
                viewDescBtn = document.querySelector('.toolbar-button.view-description');
            }
            if (viewDescBtn && !viewDescBtn.classList.contains('disabled')) {
                viewDescBtn.classList.add('disabled');
                setTimeout(() => {
                    viewDescBtn.classList.remove('disabled');
                }, 500);
            }
        }

        // Accept messages from same-origin or file protocol (local dev)
        if (
          !(
            window.location.protocol === "file:" ||
            event.origin === window.origin
          )
        )
          return;

        // Find the .app-window containing the iframe with this contentWindow
        let windowElement = null;
        if (event.data?.type === 'iframe-interaction' && event.data.windowId) {
          windowElement = document.getElementById(event.data.windowId);
        }
        if (!windowElement) {
          windowElement = Array.from(
            document.querySelectorAll(".app-window"),
          ).find((win) => {
            const iframe = win.querySelector("iframe");
            return iframe && iframe.contentWindow === event.source;
          });
        }
        // Fallback: if not found, try to match by src for contact app
        if (!windowElement && event.data?.type === 'iframe-interaction') {
          windowElement = Array.from(document.querySelectorAll('.app-window')).find(win => {
            const iframe = win.querySelector('iframe');
            return iframe && iframe.src.includes('contact.html');
          });
        }
        if (!windowElement) return;

        // Handle iframe-interaction message to close menubar popouts
        if (event.data?.type === 'iframe-interaction') {
          windowElement.dispatchEvent(new CustomEvent('iframe-interaction', { bubbles: false }));
          return;
        }

        if (event.data?.type === "minimize-window") {
          this.minimizeWindow(windowElement);
        } else if (event.data?.type === "close-window") {
          this.closeWindow(windowElement);
        } else if (
          event.data?.type === "updateStatusBar" &&
          typeof event.data.text === "string"
        ) {
          // Handle status bar updates from specific apps (like Notepad)
          if (windowElement.statusBarField) {
            windowElement.statusBarField.textContent = event.data.text;
          }
        }
    });

    // Add click handler to Home button to send close-lightbox message to Projects app iframe only
    const homeButton = document.querySelector('.toolbar-button.home');
    if (homeButton) {
        homeButton.addEventListener('click', function() {
            if (!homeButton.classList.contains('disabled')) {
                // Find the Projects app window and its iframe
                const projectsWindow = document.getElementById('internet-window');
                const iframe = projectsWindow ? projectsWindow.querySelector('iframe') : null;
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage({ type: 'close-lightbox' }, '*');
                }
            }
        });
    }
  }

  _setupGlobalHandlers() {
    document.addEventListener(
      "mousedown",
      (e) => {
        const clickedOnDesktopSpace =
          e.target.classList.contains("desktop") ||
          e.target.classList.contains("selection-overlay");
        if (clickedOnDesktopSpace && !e.target.closest(".window")) {
          if (this.activeWindow) {
            this.deactivateAllWindows();
          }
        }
      },
      true,
    );

    window.addEventListener(
      "message",
      (event) => {
        // Accept messages from same-origin or file protocol (local dev)
        if (
          !(
            window.location.protocol === "file:" ||
            event.origin === window.origin
          )
        )
          return;

        // Find the .app-window containing the iframe with this contentWindow
        let windowElement = null;
        if (event.data?.type === 'iframe-interaction' && event.data.windowId) {
          windowElement = document.getElementById(event.data.windowId);
        }
        if (!windowElement) {
          windowElement = Array.from(
            document.querySelectorAll(".app-window"),
          ).find((win) => {
            const iframe = win.querySelector("iframe");
            return iframe && iframe.contentWindow === event.source;
          });
        }
        // Fallback: if not found, try to match by src for contact app
        if (!windowElement && event.data?.type === 'iframe-interaction') {
          windowElement = Array.from(document.querySelectorAll('.app-window')).find(win => {
            const iframe = win.querySelector('iframe');
            return iframe && iframe.src.includes('contact.html');
          });
        }
        if (!windowElement) return;

        // Handle iframe-interaction message to close menubar popouts
        if (event.data?.type === 'iframe-interaction') {
          windowElement.dispatchEvent(new CustomEvent('iframe-interaction', { bubbles: false }));
          return;
        }

        if (event.data?.type === "minimize-window") {
          this.minimizeWindow(windowElement);
        } else if (event.data?.type === "close-window") {
          this.closeWindow(windowElement);
        } else if (
          event.data?.type === "updateStatusBar" &&
          typeof event.data.text === "string"
        ) {
          // Handle status bar updates from specific apps (like Notepad)
          if (windowElement.statusBarField) {
            windowElement.statusBarField.textContent = event.data.text;
          }
        }
      },
      true,
    );
  }

  _subscribeToEvents() {
    this.eventBus.subscribe(EVENTS.PROGRAM_OPEN, (data) =>
      this.openProgram(data.programName),
    );
    this.eventBus.subscribe(EVENTS.WINDOW_FOCUSED, (data) =>
      this._handleWindowFocus(data.windowId),
    );
    this.eventBus.subscribe(EVENTS.WINDOW_MINIMIZED, (data) =>
      this._handleWindowMinimize(data.windowId),
    );
    this.eventBus.subscribe(EVENTS.WINDOW_CLOSED, (data) =>
      this._handleWindowCloseCleanup(data.windowId),
    );
    this.eventBus.subscribe(EVENTS.WINDOW_RESTORED, (data) =>
      this._handleWindowRestore(data.windowId),
    );
    this.eventBus.subscribe(EVENTS.TASKBAR_ITEM_CLICKED, (data) =>
      this._handleTaskbarClick(data.windowId),
    );
    // NEW: Subscribe to PRELOAD_APP_REQUESTED
    this.eventBus.subscribe(EVENTS.PRELOAD_APP_REQUESTED, (data) => 
      this._handlePreloadAppRequested(data)
    );
  }

  _calculateWindowToTaskbarTransform(windowElement, taskbarItem) {
    if (!taskbarItem) return "scale(0.55)"; // Fallback if taskbar item not found

    const winRect = windowElement.getBoundingClientRect();
    const taskbarRect = taskbarItem.getBoundingClientRect();

    // Window bottom center (origin for minimize animation)
    const winBottomCenterX = winRect.left + winRect.width / 2;
    const winBottomCenterY = winRect.top + winRect.height;

    // Taskbar icon center (target for minimize animation)
    const taskbarCenterX = taskbarRect.left + taskbarRect.width / 2;
    const taskbarCenterY = taskbarRect.top + taskbarRect.height / 2;

    const scale = 0.55; // XP-like scale factor for the animation

    // Calculate translation needed to move window's bottom-center to taskbar icon's center
    const translateX = taskbarCenterX - winBottomCenterX;
    const translateY = taskbarCenterY - winBottomCenterY;

    return `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
  }

  /**
   * Open a program window by name. Handles overlays and standard windows.
   * @param {string} programName - The name/key of the program to open.
   * @returns {void}
   */
  openProgram(programName) {
    const program = this.programData[programName];
    if (!program || !program.id) {
      console.warn(`[WINDOW.JS] Program configuration not found for: ${programName}`);
      return;
    }

    const existingWindow = document.getElementById(program.id);
    if (existingWindow) {
      if (
        existingWindow.windowState &&
        existingWindow.windowState.isMinimized
      ) {
        this.restoreWindow(existingWindow);
      } else {
        this.bringToFront(existingWindow);
      }
      return;
    }

    // Reset isOpen flag if it was somehow stuck from a previous session without proper cleanup
    // (Though session persistence of 'isOpen' isn't typical for this kind of app state)
    if (program.isOpen) {
        // console.warn(`[WINDOW.JS] Program ${programName} was marked as open, resetting.`);
        program.isOpen = false; 
    }

    const windowElement = this._createWindowElement(program);
    if (!windowElement) {
        console.error(`[WINDOW.JS] Failed to create window element for ${programName}.`);
        return;
    }

    if (programName === "internet") {
      windowElement.style.left = "";
      windowElement.style.top = "";
      if (windowElement.windowState) {
        windowElement.windowState.originalStyles.left = "";
        windowElement.windowState.originalStyles.top = "";
      }
    }

    windowElement.classList.add("window-opening");
    windowElement.addEventListener("animationend", function handler(e) {
      if (e.animationName === "windowOpenFadeSlide") {
        windowElement.classList.remove("window-opening");
        windowElement.removeEventListener("animationend", handler);
      }
    });

    this.windowsContainer.appendChild(windowElement);
    this._registerWindow(windowElement, program);
    this.positionWindow(windowElement);

    // MODIFICATION: If it's "My Projects" and user is already logged in, load iframe content immediately.
    if (program.id === 'internet' && sessionStorage.getItem("logged_in") === "true") {
        console.log('[WINDOW.JS] My Projects opened post-login. Loading content immediately.');
        this._loadProjectsIframeAndTriggerPreload(windowElement);
    }

    if (programName === "mediaPlayer") {
      let iframe = windowElement.querySelector("iframe");
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: "load-demo-videos" }, "*");
      }
    }

    program.isOpen = true;
    this.eventBus.publish(EVENTS.WINDOW_CREATED, {
      windowId: windowElement.id,
      programName,
      title: program.title,
      icon: program.icon,
    });

    if (program.startMinimized) {
      this.minimizeWindow(windowElement);
    } else {
      this.bringToFront(windowElement);
    }
  }

  /**
   * Create a window DOM element for a program.
   * @private
   * @param {Object} program - Program configuration object.
   * @returns {HTMLElement|null} The created window element or null on error.
   */
  _createWindowElement(program) {
    const windowElement = document.createElement("div");
    windowElement.id = program.id;
    // Ensure classList is always an array-like object for spread/iteration safety later
    windowElement.className = "app-window"; 
    windowElement.setAttribute(
      "data-program",
      program.id.replace("-window", ""),
    );
    
    // Default to empty string if program.title is undefined
    const windowTitle = program.title || 'Untitled Window';
    const windowIcon = program.icon || './assets/icons/default.png'; // Fallback icon

    windowElement.innerHTML = this._getWindowBaseHTML({ ...program, title: windowTitle, icon: windowIcon });

    // --- Mobile Maximized Logic ---
    if (isMobileDevice()) {
      windowElement.classList.add("maximized");
      windowElement.style.position = "fixed";
      windowElement.style.left = "0";
      windowElement.style.top = "0";
      windowElement.style.width = "100vw";
      windowElement.style.height = "100vh";
      windowElement.style.maxWidth = "100vw";
      windowElement.style.maxHeight = "100vh";
    }

    let content;
    content = WindowTemplates.getTemplate(program.template, program);
    if (!content) {
      return null;
    }
    windowElement.appendChild(content);
    this._addStartMenuOverlay(windowElement, content);

    // If content contains a menu bar, wire it up to the window element
    const menuBarContainer = content.querySelector(".menu-bar-container");
    if (
      menuBarContainer &&
      typeof menuBarContainer.setParentWindowElement === "function"
    ) {
      menuBarContainer.setParentWindowElement(windowElement);
    }

    // Create Status Bar
    const programName = program.id.replace("-window", "");
    if (programName !== "cmd") {
      const statusBar = document.createElement("div");
      statusBar.className = "status-bar";
      // --- Create main text field (dynamic or static) ---
      const statusBarField = document.createElement("p");
      statusBarField.className = "status-bar-field"; // Class for the main/dynamic field
      // Determine initial text based on flags and program data
      let initialText = "Ready";
      if (program.statusBarText) {
        initialText = program.statusBarText; // Use static text from registry
      }
      statusBarField.textContent = initialText;
      // Append the main status field
      statusBar.appendChild(statusBarField);

      // Append the status bar to the window element itself
      windowElement.appendChild(statusBar);
      // Store reference for dynamic updates (always points to the main field)
      windowElement.statusBarField = statusBarField;
    }

    const defaultWidth = 600;
    const defaultHeight = 400;
    windowElement.style.width = `${program.dimensions?.width || defaultWidth}px`;
    windowElement.style.height = `${program.dimensions?.height || defaultHeight}px`;
    windowElement.style.position = "absolute";

    // --- Listen for request-close-window event from menu bar popout ---
    windowElement.addEventListener("request-close-window", () => {
      this.closeWindow(windowElement);
    });
    windowElement.addEventListener("request-minimize-window", () => {
      this.minimizeWindow(windowElement);
    });
    windowElement.addEventListener("request-maximize-window", () => {
      this.toggleMaximize(windowElement);
    });

    return windowElement;
  }

  /**
   * Get the base HTML for a window (title bar, controls, etc.).
   * @private
   * @param {Object} program - Program configuration object.
   * @returns {string} HTML string for the window base.
   */
  _getWindowBaseHTML(program) {
    const isMobile = isMobileDevice();
    return `
            <div class="window-inactive-mask"></div>
            <div class="title-bar">
                <div class="title-bar-left">
                    <div class="title-bar-icon">
                        <img src="${program.icon}" alt="${program.title}">
                    </div>
                    <div class="title-bar-text">${program.title}</div>
                </div>
                <div class="title-bar-controls">
                    ${program.canMinimize !== false ? '<button class="xp-button" aria-label="Minimize" data-action="minimize"></button>' : ""}
                    ${!isMobile && program.canMaximize !== false ? '<button class="xp-button" aria-label="Maximize" data-action="maximize"></button>' : ""}
                    <button class="xp-button" aria-label="Close" data-action="close"></button>
                </div>
            </div>
        `;
  }

  /**
   * Add the start menu overlay to a window's content container.
   * @private
   * @param {HTMLElement} windowElement - The window DOM element.
   * @param {HTMLElement} contentContainer - The content container element.
   * @returns {void}
   */
  _addStartMenuOverlay(windowElement, contentContainer) {
    const startMenuOverlay = document.createElement("div");
    startMenuOverlay.className = "start-menu-content-click-overlay";
    const targetContainer = contentContainer.classList.contains("window-body")
      ? contentContainer
      : windowElement;
    if (targetContainer !== windowElement) {
      targetContainer.style.position = "relative";
    }
    targetContainer.appendChild(startMenuOverlay);
  }

  /**
   * Register a window and its taskbar item.
   * @private
   * @param {HTMLElement} windowElement - The window DOM element.
   * @param {Object} program - Program configuration object.
   * @returns {void}
   */
  _registerWindow(windowElement, program) {
    const windowId = windowElement.id;
    this.windows[windowId] = windowElement;
    this.taskbarItems[windowId] = this._createTaskbarItem(
      windowElement,
      program,
    );

    windowElement.windowState = {
      isMaximized: false,
      isMinimized: false,
      originalStyles: {
        width: windowElement.style.width,
        height: windowElement.style.height,
        top: windowElement.style.top,
        left: windowElement.style.left,
        transform: windowElement.style.transform,
      },
    };

    this._setupWindowEvents(windowElement);

    // Add to stack and update Z-indices
    this._updateStackOrder(windowId, "add");
    this._updateZIndices();
  }

  /**
   * Create a taskbar item for a window.
   * @private
   * @param {HTMLElement} windowElement - The window DOM element.
   * @param {Object} program - Program configuration object.
   * @returns {HTMLElement} The created taskbar item element.
   */
  _createTaskbarItem(windowElement, program) {
    const taskbarItem = document.createElement("div");
    taskbarItem.className = "taskbar-item";
    taskbarItem.id = `taskbar-${windowElement.id}`;
    taskbarItem.setAttribute("data-window-id", windowElement.id);
    taskbarItem.innerHTML = `
            <img src="${program.icon}" alt="${program.title}" />
            <span>${program.title}</span>
        `;

    this._bindControl(taskbarItem, "mousedown", () => {
      this.eventBus.publish(EVENTS.TASKBAR_ITEM_CLICKED, {
        windowId: windowElement.id,
      });
    });

    this.taskbarPrograms.appendChild(taskbarItem);
    return taskbarItem;
  }

  /**
   * Set up all event listeners for a window.
   * @private
   * @param {HTMLElement} windowElement - The window DOM element.
   * @returns {void}
   */
  _setupWindowEvents(windowElement) {
    const titleBar = windowElement.querySelector(".title-bar");
    const startMenuOverlay = windowElement.querySelector(
      ".start-menu-content-click-overlay",
    );

    this._bindControl(
      windowElement.querySelector('[data-action="close"]'),
      "click",
      () => this.closeWindow(windowElement),
    );
    this._bindControl(
      windowElement.querySelector('[data-action="minimize"]'),
      "click",
      () => this.minimizeWindow(windowElement),
    );
    this._bindControl(
      windowElement.querySelector('[data-action="maximize"]'),
      "click",
      () => this.toggleMaximize(windowElement),
    );

    // Listen for custom minimize-window event (from toolbar)
    windowElement.addEventListener("minimize-window", () => {
      this.minimizeWindow(windowElement);
    });

    if (titleBar) {
      this._bindControl(titleBar, "dblclick", () =>
        this.toggleMaximize(windowElement),
      );
      this.makeDraggable(windowElement, titleBar);
    }

    this._bindControl(
      windowElement,
      "mousedown",
      () => {
        if (windowElement !== this.activeWindow) {
          this.bringToFront(windowElement);
        }
      },
      true,
    );

    if (startMenuOverlay) {
      this._bindControl(startMenuOverlay, "mousedown", (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.eventBus.publish(EVENTS.STARTMENU_CLOSE_REQUEST);
      });
    }

    this._setupIframeActivationOverlay(windowElement);

    // Add listeners for toolbar actions within this window
    const toolbarButtons = windowElement.querySelectorAll('.toolbar-button[data-action]');
    toolbarButtons.forEach(button => {
        this._bindControl(button, 'click', () => {
            if (button.classList.contains('disabled')) return; // Do nothing if button is disabled
            const action = button.getAttribute('data-action');
            this._handleToolbarAction(action, windowElement);
        });
    });
  }

  /**
   * Handle actions from toolbar buttons.
   * @private
   * @param {string} action - The action to perform.
   * @param {HTMLElement} windowElement - The window element a Mcting as context.
   * @returns {void}
   */
  _handleToolbarAction(action, windowElement) {
    const windowId = windowElement.id; // Get the window ID for specific throttling

    // Throttle 'viewDescription' action for 'internet-window' (My Projects)
    if (action === 'viewDescription' && windowId === 'internet-window') {
      const now = Date.now();
      const buttonKey = `${windowId}-${action}`;
      const viewDescButton = windowElement.querySelector('.toolbar-button.view-description'); // Get the button element

      if (!this.lastInteractionTimes[buttonKey]) {
        this.lastInteractionTimes[buttonKey] = 0;
      }

      const timeSinceLastClick = now - this.lastInteractionTimes[buttonKey];
      const throttleDuration = 500; // Changed from 1000ms to 500ms (0.5 seconds)

      if (timeSinceLastClick < throttleDuration) {
        if (viewDescButton) {
          viewDescButton.classList.add('disabled');
          // Re-enable after the throttle period for this specific click has passed
          setTimeout(() => {
            // Only re-enable if another click hasn't re-disabled it in the meantime
            const currentTime = Date.now();
            if (currentTime - this.lastInteractionTimes[buttonKey] >= throttleDuration) {
                 if (viewDescButton) viewDescButton.classList.remove('disabled');
            }
          }, throttleDuration - timeSinceLastClick);
        }
        return; // Ignore the click if it's too soon
      }
      
      // Not throttled, proceed with action but disable button for the throttle duration
      this.lastInteractionTimes[buttonKey] = now; // Update the timestamp
      if (viewDescButton) {
        viewDescButton.classList.add('disabled');
        setTimeout(() => {
            // Only re-enable if another click hasn't re-disabled it in the meantime
            // This check is important if the user clicks again right before this timeout fires.
            const currentTime = Date.now();
            if (currentTime - this.lastInteractionTimes[buttonKey] >= throttleDuration) {
                 if (viewDescButton) viewDescButton.classList.remove('disabled');
            }
        }, throttleDuration);
      }
    }

    switch (action) {
        case 'openInternet': 
        case 'openProjects': 
            this.openProgram('internet');
            break;
        case 'openExternalLink': 
            const buttonElement = windowElement.querySelector('.toolbar-button.viewExternalLink');
            if (buttonElement && buttonElement.dataset.urlToOpen && !buttonElement.classList.contains('disabled')) {
                window.open(buttonElement.dataset.urlToOpen, '_blank');
            } else {
                // External link not found or button was clicked when disabled.
            }
            break;
        case 'openResume':   
            this.openProgram('resume');
            break;
        case 'openContact': // For "Contact Me" on "My Resume" toolbar
            this.openProgram('contact');
            break;
        case 'saveResume':
            const link = document.createElement('a');
            link.href = './assets/apps/resume/resumeMitchIvin.pdf';
            link.download = 'resumeMitchIvin.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            break;
        case 'navigatePrevious':
        case 'navigateNext':
            const iframeForGenericAction = windowElement.querySelector('iframe');
            if (iframeForGenericAction && iframeForGenericAction.contentWindow) {
                iframeForGenericAction.contentWindow.postMessage({ type: 'toolbar-action', action: action }, '*');
            }
            break;
        case 'sendMessage':
            const contactIframe = windowElement.querySelector('iframe');
            if (contactIframe && contactIframe.contentWindow) {
                // 1. Post message to get form data
                contactIframe.contentWindow.postMessage({ type: 'getContactFormData' }, '*');

                // 2. Listen for the response
                const mailtoListener = (event) => {
                    // Ensure the message is from the contact app's iframe and is the correct type
                    if (event.source === contactIframe.contentWindow && event.data && event.data.type === 'contactFormDataResponse') {
                        const formData = event.data.data;
                        const to = formData.to; // This is mitchellivin@gmail.com
                        const subject = encodeURIComponent(formData.subject);
                        const body = encodeURIComponent(formData.message);

                        let mailtoLink = `mailto:${to}`;
                        mailtoLink += `?subject=${subject}`;
                        mailtoLink += `&body=${body}`;

                        // 3. Open mailto link
                        window.open(mailtoLink, '_blank');

                        // 4. Clean up listener
                        window.removeEventListener('message', mailtoListener);
                    }
                };
                window.addEventListener('message', mailtoListener);
            }
            break;
        default:
            // Unhandled toolbar action: send a generic message
            const genericIframe = windowElement.querySelector('iframe');
            if (genericIframe && genericIframe.contentWindow) {
                genericIframe.contentWindow.postMessage({ type: 'toolbar-action', action: action }, '*');
            }
            break;
    }
  }

  /**
   * Set up iframe overlays for activation/focus.
   * @private
   * @param {HTMLElement} windowElement - The window DOM element.
   * @returns {void}
   */
  _setupIframeActivationOverlay(windowElement) {
    const iframes = windowElement.querySelectorAll("iframe");
    if (!windowElement.iframeOverlays) windowElement.iframeOverlays = [];

    iframes.forEach((iframe) => {
      const overlay = document.createElement("div");
      overlay.className = "iframe-overlay";
      overlay.style.position = "absolute";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      // Do not set z-index here; CSS ensures overlay is always below window content
      overlay.style.display = "none";

      const iframeParent = iframe.parentElement;
      if (iframeParent) {
        iframeParent.style.position = "relative";
        iframeParent.appendChild(overlay);

        this._bindControl(overlay, "mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (windowElement !== this.activeWindow) {
            this.bringToFront(windowElement);
          }
        });
        windowElement.iframeOverlays.push(overlay);
      }

      // --- New: Listen for focus/click on iframe to close menubar popouts ---
      iframe.addEventListener('focus', () => {
        windowElement.dispatchEvent(new CustomEvent('iframe-interaction', { bubbles: false }));
      });
      iframe.addEventListener('mousedown', () => {
        windowElement.dispatchEvent(new CustomEvent('iframe-interaction', { bubbles: false }));
      });
    });
  }

  /**
   * Handle a click on a taskbar item.
   * @private
   * @param {string} windowId - The ID of the window.
   * @returns {void}
   */
  _handleTaskbarClick(windowId) {
    const windowElement = this.windows[windowId];
    if (windowElement) {
      if (windowElement.windowState.isMinimized) {
        this.restoreWindow(windowElement);
      } else if (this.activeWindow === windowElement) {
        this.minimizeWindow(windowElement);
      } else {
        this.bringToFront(windowElement);
      }
    } else {
      // Check if the program already exists but with a different ID
      const programName = windowId.replace("-window", "");

      // Check if any window for this program is already open
      const existingWindows = Object.values(this.windows);
      const existingWindow = existingWindows.find(
        (window) => window.getAttribute("data-program") === programName,
      );

      if (existingWindow) {
        // Existing window found, bring it to front or restore it
        if (existingWindow.windowState.isMinimized) {
          this.restoreWindow(existingWindow);
        } else {
          this.bringToFront(existingWindow);
        }
      } else if (programName && this.programData[programName]) {
        // No existing window - open a new one
        this.openProgram(programName);
      }
    }
  }

  /**
   * Handle window focus event.
   * @private
   * @param {string} windowId - The ID of the window.
   * @returns {void}
   */
  _handleWindowFocus(windowId) {
    const windowElement = this.windows[windowId];
    if (windowElement && !windowElement.windowState.isMinimized) {
      this.bringToFront(windowElement);
    }
  }

  /**
   * Handle window restore event.
   * @private
   * @param {string} windowId - The ID of the window.
   * @returns {void}
   */
  _handleWindowRestore(windowId) {
    const windowElement = this.windows[windowId];
    if (windowElement) {
      this.restoreWindow(windowElement);
    }
  }

  /**
   * Handle window minimize event.
   * @private
   * @param {string} windowId - The ID of the window.
   * @returns {void}
   */
  _handleWindowMinimize(windowId) {
    const windowElement = this.windows[windowId];
    if (windowElement) {
      this.minimizeWindow(windowElement);
    }
  }

  /**
   * Handle window close cleanup event.
   * @private
   * @param {string} windowId - The ID of the window.
   * @returns {void}
   */
  _handleWindowCloseCleanup(windowId) {
    const windowElement = this.windows[windowId];
    if (!windowElement) return;

    // Remove taskbar item from DOM first
    const taskbarItem = this.taskbarItems[windowId];
    if (taskbarItem && taskbarItem.parentNode) {
      taskbarItem.parentNode.removeChild(taskbarItem);
    }

    // Clean up references
    delete this.windows[windowId];
    delete this.taskbarItems[windowId];

    // If this was the active window, activate next window in stack
    if (this.activeWindow === windowElement) {
      this.activeWindow = null;
      // Find and focus next window
      this._refreshActiveWindow();
    }

    this.windowCount = Math.max(0, this.windowCount - 1);

    // Remove from stack and update Z-indices
    this._updateStackOrder(windowId, "remove");
    this._updateZIndices();

    // If no windows remain, reset cascade position
    if (Object.keys(this.windows).length === 0) {
      this.cascadeColumn = 0;
      this.cascadeRow = 0;
    }

    this.eventBus.publish(EVENTS.WINDOW_CLOSED, { windowId });
  }

  /**
   * Refresh the active window after a close or minimize.
   * @private
   * @returns {void}
   */
  _refreshActiveWindow() {
    // Find the topmost non-minimized window to activate
    const topWindow = this._findTopWindow();
    if (topWindow) {
      this.bringToFront(topWindow);
    } else {
      // No windows active - make sure all taskbar items are inactive
      this._clearAllTaskbarItemStates();
    }
  }

  /**
   * Clear all taskbar item active states.
   * @private
   * @returns {void}
   */
  _clearAllTaskbarItemStates() {
    Object.values(this.taskbarItems).forEach((taskbarItem) => {
      if (taskbarItem) {
        taskbarItem.classList.remove("active");
      }
    });
  }

  /**
   * Update the active state of a taskbar item.
   * @private
   * @param {string} windowId - The ID of the window.
   * @param {boolean} isActive - Whether the window is active.
   * @returns {void}
   */
  _updateTaskbarItemState(windowId, isActive) {
    // Always clear all active states first for consistency
    this._clearAllTaskbarItemStates();

    // If we're setting a window active, update just that one
    if (isActive) {
      const taskbarItem = this.taskbarItems[windowId];
      if (taskbarItem) {
        taskbarItem.classList.add("active");
      }
    }
  }

  /**
   * Close a window and clean up associated DOM and taskbar items.
   * @param {HTMLElement} windowElement - The window DOM element to close.
   * @returns {void}
   */
  closeWindow(windowElement) {
    if (!windowElement) return;
    const windowId = windowElement.id;
    // Prevent double-close
    if (windowElement.classList.contains("window-closing")) return;
    // Add closing animation class
    windowElement.classList.add("window-closing");
    windowElement.addEventListener("animationend", function handler(e) {
      if (e.animationName === "windowCloseFade") {
        windowElement.removeEventListener("animationend", handler);
        // Remove from DOM after animation
        if (windowElement.parentNode) {
          windowElement.parentNode.removeChild(windowElement);
        }
      }
    });
    this._handleWindowCloseCleanup(windowId);
    // Fix: Define programName from the element's attribute
    const programName = windowElement.getAttribute("data-program");
    if (programName && this.programData[programName]) {
      this.programData[programName].isOpen = false;
    }
    // NEW: If closing My Projects window, ensure its hidden preload iframe is also removed
    if (windowId === 'internet-window' && this.preloadedAppIframes['internet']) {
        this.preloadedAppIframes['internet'].remove();
        delete this.preloadedAppIframes['internet'];
        console.log('[WINDOW.JS] Removed hidden preload iframe for My Projects due to window closure.');
    }
    this.eventBus.publish(EVENTS.WINDOW_CLOSED, { windowId });
  }

  /**
   * Minimize a window (hide and update taskbar state).
   * @param {HTMLElement} windowElement - The window DOM element to minimize.
   * @returns {void}
   */
  minimizeWindow(windowElement) {
    if (!windowElement || windowElement.windowState.isMinimized) return;

    const taskbarItem = this.taskbarItems[windowElement.id];
    const minimizeTransform = this._calculateWindowToTaskbarTransform(windowElement, taskbarItem);

    windowElement.style.setProperty(
      "--window-minimize-transform",
      minimizeTransform,
    );
    windowElement.classList.add("window-minimizing");
    windowElement.addEventListener(
      "animationend",
      function handler(e) {
        if (e.animationName === "windowMinimizeZoom") {
          windowElement.classList.remove("window-minimizing");
          windowElement.style.removeProperty("--window-minimize-transform");
          windowElement.style.display = "none";
          windowElement.classList.add("minimized");
          windowElement.windowState.isMinimized = true;
          this._setWindowZIndex(windowElement, "");
          this._updateTaskbarItemState(windowElement.id, false);
          this._updateStackOrder(windowElement.id, "remove");
          this._updateZIndices();
          if (this.activeWindow === windowElement) {
            this.activeWindow = null;
            const topWindow = this._findTopWindow();
            if (topWindow) {
              this.bringToFront(topWindow);
            }
          }
          this.eventBus.publish(EVENTS.WINDOW_MINIMIZED, {
            windowId: windowElement.id,
          });
          windowElement.removeEventListener("animationend", handler);
        }
      }.bind(this),
    );
  }

  /**
   * Restore a minimized window to its previous state and focus.
   * @param {HTMLElement} windowElement - The window DOM element to restore.
   * @returns {void}
   */
  restoreWindow(windowElement) {
    if (!windowElement || !windowElement.windowState.isMinimized) return;
    windowElement.classList.remove("minimized");
    windowElement.windowState.isMinimized = false;
    windowElement.style.display = "flex";

    const taskbarItem = this.taskbarItems[windowElement.id];
    const restoreTransform = this._calculateWindowToTaskbarTransform(windowElement, taskbarItem);

    windowElement.style.setProperty(
      "--window-restore-transform",
      restoreTransform,
    );
    windowElement.classList.add("window-restoring");
    windowElement.addEventListener("animationend", function handler(e) {
      if (e.animationName === "windowRestoreZoom") {
        windowElement.classList.remove("window-restoring");
        windowElement.style.removeProperty("--window-restore-transform");
        windowElement.removeEventListener("animationend", handler);
      }
    });
    this._updateStackOrder(windowElement.id, "add");
    this.bringToFront(windowElement);
  }

  /**
   * Toggle maximize/restore for a window.
   * @param {HTMLElement} windowElement - The window DOM element to maximize/restore.
   * @returns {void}
   */
  toggleMaximize(windowElement) {
    if (!windowElement) return;
    const state = windowElement.windowState;
    const maximizeBtn = windowElement.querySelector('[aria-label="Maximize"]');

    if (!state.isMaximized) {
      // Maximize
      const rect = windowElement.getBoundingClientRect();
      // Store current styles *before* maximizing
      state.originalStyles = {
        width: windowElement.style.width || rect.width + "px",
        height: windowElement.style.height || rect.height + "px",
        top: windowElement.style.top || rect.top + "px",
        left: windowElement.style.left || rect.left + "px",
        transform: windowElement.style.transform || "",
      };

      // Dynamically measure the taskbar height
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;
      const taskbar = document.querySelector(".taskbar");
      const taskbarHeight = taskbar ? taskbar.offsetHeight : TASKBAR_HEIGHT;

      // Use requestAnimationFrame to batch style changes
      window.requestAnimationFrame(() => {
        windowElement.style.top = "0px";
        windowElement.style.left = "0px";
        windowElement.style.width = vw + "px";
        windowElement.style.height = vh - taskbarHeight + "px";
        windowElement.style.transform = "none";

        state.isMaximized = true;
        windowElement.classList.add("maximized"); // Add class to trigger CSS styles
        if (maximizeBtn) {
          maximizeBtn.classList.add("restore");
        }
        // Send maximized message to iframe if present
        const iframe = windowElement.querySelector("iframe");
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: "window:maximized" }, "*");
        }
        this.eventBus.publish(EVENTS.WINDOW_MAXIMIZED, {
          windowId: windowElement.id,
        });
      });
    } else {
      // Restore
      window.requestAnimationFrame(() => {
        windowElement.style.width = state.originalStyles.width;
        windowElement.style.height = state.originalStyles.height;
        windowElement.style.top = state.originalStyles.top;
        windowElement.style.left = state.originalStyles.left;
        windowElement.style.transform = state.originalStyles.transform;

        // Clear potentially conflicting maximized styles explicitly
        windowElement.style.margin = "";
        windowElement.style.border = "";
        windowElement.style.borderRadius = "";
        windowElement.style.boxSizing = "";

        state.isMaximized = false;
        windowElement.classList.remove("maximized"); // Remove class
        if (maximizeBtn) {
          maximizeBtn.classList.remove("restore");
        }
        // Send unmaximized message to iframe if present
        const iframe = windowElement.querySelector("iframe");
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: "window:unmaximized" }, "*");
        }
        this.eventBus.publish(EVENTS.WINDOW_UNMAXIMIZED, {
          windowId: windowElement.id,
        });
      });
    }
  }

  /**
   * Bring the specified window to the front/top of the stack.
   * @param {HTMLElement} windowElement - The window DOM element to bring to front.
   * @returns {void}
   */
  bringToFront(windowElement) {
    if (
      !windowElement ||
      this.activeWindow === windowElement ||
      windowElement.windowState.isMinimized
    ) {
      return;
    }

    const previouslyActive = this.activeWindow;
    this.deactivateAllWindows(windowElement);

    windowElement.classList.add("active");
    this.activeWindow = windowElement;

    // Update stack order and apply new Z-indices
    this._updateStackOrder(windowElement.id, "add");
    this._updateZIndices();

    this._toggleInactiveMask(windowElement, false); // Hide mask
    this._toggleIframeOverlays(windowElement, false); // Hide overlays
    this._updateTaskbarItemState(windowElement.id, true);

    if (previouslyActive !== this.activeWindow) {
      this.eventBus.publish(EVENTS.WINDOW_FOCUSED, {
        windowId: windowElement.id,
      });
    }
  }

  /**
   * Deactivate all windows except the optionally specified one.
   * @param {HTMLElement|null} excludeWindow - A window to exclude from deactivation.
   * @returns {void}
   */
  deactivateAllWindows(excludeWindow = null) {
    Object.values(this.windows).forEach((win) => {
      if (win !== excludeWindow) {
        win.classList.remove("active");
        this._toggleInactiveMask(win, true); // Show mask
        this._toggleIframeOverlays(win, true); // Show overlays
        this._updateTaskbarItemState(win.id, false); // Deactivate taskbar
      }
    });

    if (!excludeWindow) {
      this.activeWindow = null;
    }
  }

  /**
   * Set the z-index of a window.
   * @private
   * @param {HTMLElement} windowElement - The window DOM element.
   * @param {string|number} zIndex - The z-index value.
   * @returns {void}
   */
  _setWindowZIndex(windowElement, zIndex) {
    if (windowElement) {
      windowElement.style.zIndex = zIndex;
    }
  }

  /**
   * Show or hide the inactive mask on a window.
   * @private
   * @param {HTMLElement} windowElement - The window DOM element.
   * @param {boolean} show - Whether to show the mask.
   * @returns {void}
   */
  _toggleInactiveMask(windowElement, show) {
    const inactiveMask = windowElement.querySelector(".window-inactive-mask");
    if (inactiveMask) {
      inactiveMask.style.display = show ? "block" : "none";
    }
  }

  /**
   * Show or hide iframe overlays for a window.
   * @private
   * @param {HTMLElement} windowElement - The window DOM element.
   * @param {boolean} show - Whether to show overlays.
   * @returns {void}
   */
  _toggleIframeOverlays(windowElement, show) {
    if (windowElement.iframeOverlays) {
      windowElement.iframeOverlays.forEach(
        (overlay) => (overlay.style.display = show ? "block" : "none"),
      );
    }
  }

  /**
   * Position a window on the screen (cascade or custom).
   * @param {HTMLElement} windowElement - The window DOM element.
   * @returns {void}
   */
  positionWindow(windowElement) {
    const programName = windowElement.getAttribute("data-program");
    const program = this.programData[programName];

    this._constrainWindowToViewport(windowElement);

    // Position window: cascade or custom
    if (program && program.position && program.position.type === "custom") {
      this.positionWindowCustom(windowElement, program.position);
    } else {
      this.positionWindowCascade(windowElement);
    }

    if (windowElement.windowState) {
      windowElement.windowState.originalStyles.left = windowElement.style.left;
      windowElement.windowState.originalStyles.top = windowElement.style.top;
      windowElement.windowState.originalStyles.transform =
        windowElement.style.transform;
    }

    this.windowCount++;
  }

  /**
   * Position a window using cascade logic (XP-style).
   * @private
   * @param {HTMLElement} windowElement - The window DOM element.
   * @returns {void}
   */
  positionWindowCascade(windowElement) {
    // XP: Start at fixed point, offset diagonally, after 8 windows start new column
    const maxPerColumn = 8;
    const initialOffsetX = 120;
    const initialOffsetY = 50;
    const offsetX = 32; // Diagonal step right
    const offsetY = 32; // Diagonal step down
    const columnSpacing = 320; // Space between columns

    // Calculate current column and row
    const totalWindows = Object.values(this.windows).filter(
      (w) => !w.windowState.isMinimized,
    ).length;
    const col = Math.floor(totalWindows / maxPerColumn);
    const row = totalWindows % maxPerColumn;

    // Calculate position
    let x = initialOffsetX + col * columnSpacing + row * offsetX;
    let y = initialOffsetY + col * offsetY + row * offsetY;

    // Prevent overlap with taskbar
    const windowHeight = parseInt(windowElement.style.height) || 400;
    const viewportHeight = document.documentElement.clientHeight;
    const maxTop = viewportHeight - windowHeight - TASKBAR_HEIGHT;
    if (y > maxTop) y = Math.max(0, maxTop);
    y = Math.max(0, y);

    windowElement.style.position = "absolute";
    windowElement.style.left = x + "px";
    windowElement.style.top = y + "px";
    windowElement.style.transform = "none";
  }

  /**
   * Constrain a window to the viewport.
   * @private
   * @param {HTMLElement} windowElement - The window DOM element.
   * @returns {void}
   */
  _constrainWindowToViewport(windowElement) {
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const taskbarHeight = TASKBAR_HEIGHT;
    const windowWidth = parseInt(windowElement.style.width) || 600;
    let windowLeft = parseInt(windowElement.style.left) || 0;
    let windowTop = parseInt(windowElement.style.top) || 0;

    const minVisibleWidth = 50;
    const minVisibleHeight = 20;

    windowLeft = Math.max(
      -windowWidth + minVisibleWidth,
      Math.min(windowLeft, viewportWidth - minVisibleWidth),
    );
    windowTop = Math.max(
      0,
      Math.min(windowTop, viewportHeight - taskbarHeight - minVisibleHeight),
    );

    windowElement.style.left = `${windowLeft}px`;
    windowElement.style.top = `${windowTop}px`;

    if (windowElement.windowState) {
      windowElement.windowState.originalStyles.left = windowElement.style.left;
      windowElement.windowState.originalStyles.top = windowElement.style.top;
    }
  }

  /**
   * Make a window draggable by its handle element.
   * @param {HTMLElement} windowElement - The window DOM element to drag.
   * @param {HTMLElement} handleElement - The handle (e.g., titlebar) to initiate drag.
   * @returns {void}
   */
  makeDraggable(windowElement, handleElement) {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    const endDrag = (e) => {
      if (!isDragging) return;

      const finalClientX =
        e.clientX ?? e.changedTouches?.[0]?.clientX ?? startX;
      const finalClientY =
        e.clientY ?? e.changedTouches?.[0]?.clientY ?? startY;
      const deltaX = finalClientX - startX;
      const deltaY = finalClientY - startY;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const taskbarHeight = TASKBAR_HEIGHT;
      const windowWidth = windowElement.offsetWidth;
      const finalLeft = initialX + deltaX;
      const finalTop = initialY + deltaY;

      const constrainedLeft = Math.max(
        -windowWidth + 100,
        Math.min(finalLeft, viewportWidth - 100),
      );
      const constrainedTop = Math.max(
        0,
        Math.min(finalTop, viewportHeight - taskbarHeight - 20),
      );

      windowElement.style.left = `${constrainedLeft}px`;
      windowElement.style.top = `${constrainedTop}px`;

      if (windowElement.windowState) {
        windowElement.windowState.originalStyles.left =
          windowElement.style.left;
        windowElement.windowState.originalStyles.top = windowElement.style.top;
        windowElement.windowState.originalStyles.transform = "none";
      }

      cleanupAfterDrag();
      isDragging = false;
    };

    function prepareWindowForDrag() {
      windowElement.classList.add("dragging-window");
      const rect = windowElement.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      windowElement.style.transform = `translate3d(0px, 0px, 0px)`;
    }

    function cleanupAfterDrag() {
      windowElement.classList.remove("dragging-window");
      windowElement.style.transform = "none";
    }

    handleElement.addEventListener("mousedown", (e) => {
      if (
        e.button !== 0 ||
        e.target.tagName === "BUTTON" ||
        (windowElement.windowState && windowElement.windowState.isMaximized) ||
        isMobileDevice()
      )
        return;
      startX = e.clientX;
      startY = e.clientY;
      isDragging = true;
      // Dispatch custom event to close menubar popouts
      windowElement.dispatchEvent(
        new CustomEvent("window-drag-start", { bubbles: false }),
      );
      prepareWindowForDrag();
      e.preventDefault();
    });
    handleElement.addEventListener(
      "touchstart",
      (e) => {
        if (
          e.target.tagName === "BUTTON" ||
          (windowElement.windowState && windowElement.windowState.isMaximized) ||
          isMobileDevice()
        )
          return;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        isDragging = true;
        // Dispatch custom event to close menubar popouts
        windowElement.dispatchEvent(
          new CustomEvent("window-drag-start", { bubbles: false }),
        );
        prepareWindowForDrag();
        e.preventDefault();
      },
      { passive: false },
    );

    document.addEventListener(
      "mousemove",
      (e) => {
        if (isDragging) {
          const deltaX = e.clientX - startX;
          const deltaY = e.clientY - startY;
          e.preventDefault();
          windowElement.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
        }
      },
      { passive: false },
    );
    document.addEventListener(
      "touchmove",
      (e) => {
        if (isDragging) {
          const touch = e.touches[0];
          const deltaX = touch.clientX - startX;
          const deltaY = touch.clientY - startY;
          e.preventDefault();
          windowElement.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
        }
      },
      { passive: false },
    );
    document.addEventListener("mouseup", endDrag);
    document.addEventListener("touchend", endDrag);
    document.addEventListener("touchcancel", endDrag);
  }

  /**
   * Update the zIndexStack array for window stacking order.
   * This ensures the most recently focused window is always on top.
   *
   * @private
   * @param {string} windowId - The window ID.
   * @param {string} action - 'add' or 'remove'.
   * @returns {void}
   */
  _updateStackOrder(windowId, action = "add") {
    // Remove existing entry if present
    const index = this.zIndexStack.indexOf(windowId);
    if (index > -1) {
      this.zIndexStack.splice(index, 1);
    }
    // Add to the end (top) if action is 'add'
    if (action === "add") {
      this.zIndexStack.push(windowId);
    }
  }

  /**
   * Apply z-index values to windows based on stack order.
   * This is the core of the window stacking logic: higher in the stack = higher z-index.
   *
   * @private
   * @returns {void}
   */
  _updateZIndices() {
    this.zIndexStack.forEach((windowId, index) => {
      const windowElement = this.windows[windowId];
      if (windowElement) {
        this._setWindowZIndex(windowElement, this.baseZIndex + index);
      }
    });
  }

  /**
   * Find the topmost non-minimized window.
   * This is used to determine which window should be active if the current one is closed or minimized.
   *
   * @private
   * @returns {HTMLElement|null} The top window or null.
   */
  _findTopWindow() {
    let topWindow = null;
    let maxZ = this.baseZIndex - 1;
    Object.values(this.windows).forEach((win) => {
      if (!win.windowState.isMinimized) {
        const z = parseInt(win.style.zIndex) || this.baseZIndex;
        if (z > maxZ) {
          maxZ = z;
          topWindow = win;
        }
      }
    });
    return topWindow;
  }

  /**
   * Bind an event handler to an element, if it exists.
   * @private
   * @param {HTMLElement} element - The element to bind to.
   * @param {string} eventType - The event type.
   * @param {Function} handler - The event handler.
   * @param {boolean} [useCapture=false] - Use capture phase.
   * @returns {void}
   */
  _bindControl(element, eventType, handler, useCapture = false) {
    if (element) {
      element.addEventListener(eventType, handler, useCapture);
    }
  }

  // NEW PRIVATE METHOD
  _handlePreloadAppRequested(data) {
    if (!data || !data.programName) return;
    const { programName } = data;

    if (programName === 'internet') { // Currently, only handling preload for My Projects
      if (this.preloadedAppIframes['internet']) {
        console.log('[WINDOW.JS] Preload for \'internet\' app already initiated.');
        return;
      }

      const programConfig = this.programData[programName];
      if (!programConfig || !programConfig.appPath) {
        console.error(`[WINDOW.JS] Cannot preload ${programName}: No program config or appPath.`);
        return;
      }

      console.log(`[WINDOW.JS] Initiating hidden preload for ${programName} from ${programConfig.appPath}`);
      const preloadIframe = document.createElement('iframe');
      preloadIframe.src = programConfig.appPath; // Load real path directly
      preloadIframe.id = `preload-iframe-${programName}`;
      preloadIframe.style.display = 'none';
      preloadIframe.style.position = 'absolute';
      preloadIframe.style.width = '1px'; // Minimize resource usage for hidden iframe
      preloadIframe.style.height = '1px';
      preloadIframe.style.left = '-9999px';
      preloadIframe.style.top = '-9999px';
      preloadIframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads');
      preloadIframe.setAttribute('allow', 'autoplay');

      preloadIframe.onload = () => {
        console.log(`[WINDOW.JS] Hidden preload iframe for ${programName} (${preloadIframe.src}) loaded. Sending "preloadVideos" message.`);
        if (preloadIframe.contentWindow) {
          preloadIframe.contentWindow.postMessage("preloadVideos", "*");
          // We don't publish PROJECTS_IFRAME_READY_FOR_PRELOAD here, as that's for the VISIBLE iframe.
        }
        this.preloadedAppIframes[programName] = preloadIframe; // Store it
      };

      preloadIframe.onerror = () => {
        console.error(`[WINDOW.JS] Error loading hidden preload iframe for ${programName}: ${preloadIframe.src}`);
        if (preloadIframe.parentNode) {
            preloadIframe.remove();
        }
        delete this.preloadedAppIframes[programName];
      };
      
      document.body.appendChild(preloadIframe); 
    }
  }

  _loadProjectsIframeAndTriggerPreload(projectsWindowElement) {
    if (!projectsWindowElement) {
        console.error('[WINDOW.JS] _loadProjectsIframeAndTriggerPreload called with no window element.');
        return;
    }
    const iframe = projectsWindowElement.querySelector('iframe');
    if (iframe && iframe.dataset.realSrc && iframe.src === 'about:blank') {
        console.log(`[WINDOW.JS] Loading real src for My Projects iframe: ${iframe.dataset.realSrc}`);
        iframe.src = iframe.dataset.realSrc;

        const handleProjectsLoadOnce = () => {
            console.log(`[WINDOW.JS] My Projects (visible) iframe content loaded (src: ${iframe.src}). Sending "preloadVideos" message.`);
            if (iframe.contentWindow) {
                iframe.contentWindow.postMessage("preloadVideos", "*");
            }
            this.eventBus.publish(EVENTS.PROJECTS_IFRAME_READY_FOR_PRELOAD, { windowId: projectsWindowElement.id });
            
            iframe.removeEventListener('load', handleProjectsLoadOnce);
            console.log('[WINDOW.JS] Removed one-time load listener for visible My Projects iframe.');

            // NEW: Clean up the hidden preload iframe now that the visible one is ready
            if (this.preloadedAppIframes['internet']) {
                this.preloadedAppIframes['internet'].remove();
                delete this.preloadedAppIframes['internet'];
                console.log('[WINDOW.JS] Removed hidden preload iframe for My Projects.');
            }
        };
        iframe.addEventListener('load', handleProjectsLoadOnce);
    } else if (iframe && iframe.src !== 'about:blank') {
        console.log('[WINDOW.JS] My Projects (visible) iframe already has a real src. Sending "preloadVideos" message (e.g. for re-focus).');
        if (iframe.contentWindow) {
            iframe.contentWindow.postMessage("preloadVideos", "*");
        }
        // If it's already loaded, also attempt cleanup of hidden iframe, just in case.
        if (this.preloadedAppIframes['internet']) {
            this.preloadedAppIframes['internet'].remove();
            delete this.preloadedAppIframes['internet'];
            console.log('[WINDOW.JS] Removed hidden preload iframe for My Projects (during re-focus/already loaded scenario).');
        }
    } else {
        console.warn('[WINDOW.JS] _loadProjectsIframeAndTriggerPreload: My Projects (visible) iframe or realSrc not found, or src not about:blank as expected.', iframe);
    }
  }
}
