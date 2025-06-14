/**
 * @fileoverview Taskbar manager for Windows XP simulation.
 * @description Manages the taskbar UI, start button, system tray, clock, and taskbar items. Integrates with the Start Menu and handles responsive layout and balloon tooltips.
 * @module scripts/gui/taskbar
 * @see {@link module:scripts/gui/startMenu.StartMenu}
 * @see {@link module:scripts/utils/eventBus.EVENTS}
 */
import StartMenu from "./startMenu.js";
import { EVENTS } from "../utils/eventBus.js";
import { setupTooltips } from "./tooltip.js"; // Corrected path from utils
import { isMobileDevice } from "../utils/device.js";
import { balloonSound } from "./boot.js"; // Import balloonSound

let taskbarSharedEventBus = null; // Module-level variable to hold the eventBus instance

/**
 * @class Clock
 * @description Manages the display and regular updates of the system clock
 *              typically shown in the taskbar's system tray.
 * @example
 * const clockDisplayElement = document.querySelector('.time');
 * const clock = new Clock(clockDisplayElement);
 * // To stop updates when no longer needed:
 * // clock.destroy();
 * @private
 */
class Clock {
  /** @type {HTMLElement | null} The DOM element used to display the time. Null if the selector doesn't find an element. */
  #clockElement;
  /** @type {number | null} ID for the interval timer that updates the clock every minute. Null if not set. */
  #intervalId = null;
  /** @type {number | null} ID for the initial timeout used to align the first clock update to the start of the next minute. Null if not set. */
  #initialTimeoutId = null;
  /** @type {Intl.DateTimeFormat} Formatter for displaying the time in HH:MM AM/PM format. */
  #timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  /**
   * Initializes a new Clock instance.
   * @param {string} selector - CSS selector for the DOM element that will display the time.
   */
  constructor(selector) {
    this.#clockElement = document.querySelector(selector);
    if (!this.#clockElement) return;
    this.setupClockUpdates();
  }

  /**
   * Sets up the mechanism for updating the clock display.
   * @description Calculates the delay until the next minute and then sets up an interval
   * to update the clock every 60 seconds. Ensures the clock updates accurately on the minute.
   * @returns {void} Nothing.
   * @private
   */
  setupClockUpdates() {
    clearTimeout(this.#initialTimeoutId);
    clearInterval(this.#intervalId);
    const now = new Date();
    const msUntilNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    this.updateClock();
    this.#initialTimeoutId = setTimeout(() => {
      this.updateClock();
      this.#intervalId = setInterval(() => this.updateClock(), 60000);
    }, msUntilNextMinute);
  }

  /**
   * Updates the clock display with the current time.
   * Formats the time to a standard (e.g., "1:30 PM").
   * @returns {void} Nothing.
   * @private
   */
  updateClock() {
    if (!this.#clockElement) return;
    this.#clockElement.textContent = this.#timeFormatter.format(new Date());
  }

  /**
   * Clears any pending timeouts or intervals for clock updates.
   * Call this when the clock is no longer needed to prevent memory leaks.
   * @returns {void} Nothing.
   */
  destroy() {
    clearTimeout(this.#initialTimeoutId);
    clearInterval(this.#intervalId);
  }
}

/**
 * @class Taskbar
 * @description Manages the main taskbar UI, including the Start button,
 * system tray, clock, and taskbar items for open applications.
 */
export default class Taskbar {
  /**
   * Constructs the Taskbar manager.
   * @param {EventBus} eventBus - The global event bus instance.
   * @see {@link module:scripts/utils/eventBus.EventBus}
   */
  constructor(eventBus) {
    /** @type {EventBus} The global event bus for inter-component communication. */
    this.eventBus = eventBus;
    taskbarSharedEventBus = eventBus; // Assign to module-level variable
    /** @type {HTMLElement} The main Start button DOM element. */
    this.startButton = document.getElementById("start-button");
    /** @type {StartMenu} Instance of the StartMenu class, managing the start menu's behavior. */
    this.startMenuComponent = new StartMenu(this.eventBus);
    /** @type {HTMLElement} The DOM element that contains taskbar program items (icons for open applications). */
    this.programsContainer = document.querySelector(".taskbar-programs");
    /** @type {HTMLElement} The DOM element representing the system tray area of the taskbar. */
    this.systemTray = document.querySelector(".system-tray");
    /** @type {HTMLElement} The main taskbar DOM element. */
    this.taskbar = document.querySelector(".taskbar");

    // Always use the desktop start button asset
    this._setStartButtonImage();
    window.addEventListener("resize", () => this._setStartButtonImage());

    this.setupStartButtonEffects();
    this.setupResponsiveTaskbar();

    // Call the new utility function for system tray icons
    setupTooltips(
      ".tray-status-icon, .tray-network-icon, .tray-volume-icon, .tray-fullscreen-icon",
      undefined,
      100,
      // Prevent tooltip if balloon is active
      () => !document.getElementById("balloon-root"),
    );

    // Initialize the clock
    new Clock(".time");

    this.subscribeToEvents();

    // Listen for fullscreen changes
    document.addEventListener("fullscreenchange", () => {
      // TODO: Implement UI updates or state changes based on fullscreen mode transitions if needed.
    });
  }

  /**
   * Subscribes to relevant global events from the event bus.
   * @description Handles events like Start Menu open/close and window creation/closure
   * to update the taskbar's state and layout accordingly.
   * @returns {void} Nothing.
   * @private
   */
  subscribeToEvents() {
    this.eventBus.subscribe(EVENTS.STARTMENU_OPENED, () => {
      this.startButton.classList.add("active");
    });

    this.eventBus.subscribe(EVENTS.STARTMENU_CLOSED, () => {
      this.startButton.classList.remove("active");
    });

    this.eventBus.subscribe(EVENTS.WINDOW_CREATED, () => {
      this.updateTaskbarLayout();
    });

    this.eventBus.subscribe(EVENTS.WINDOW_CLOSED, () => {
      this.updateTaskbarLayout();
    });

    this.eventBus.subscribe(EVENTS.MUSIC_PLAYER_PLAYING, (data) => {
      setTimeout(() => {
        if (data && data.programId === "musicPlayer") {
          const musicPlayerButton = document.querySelector(
            '.taskbar-item[data-program-id="musicPlayer-window"]',
          );
          if (musicPlayerButton) {
            const textElement = musicPlayerButton.querySelector("span");
            const imgElement = musicPlayerButton.querySelector("img");
            if (textElement && imgElement) {
              const originalTitle = imgElement.alt;
              const existingIndicator = textElement.querySelector(
                ".music-playing-indicator",
              );
              if (!existingIndicator) {
                textElement.innerHTML = `${originalTitle}<span class="music-playing-indicator" style="color: white; margin-left: 4px;">🔊</span>`;
              }
            }
          }
        }
      }, 250); // Short delay to ensure taskbar item is in DOM before attempting to modify it
    });

    this.eventBus.subscribe(EVENTS.MUSIC_PLAYER_STOPPED, (data) => {
      setTimeout(() => {
        if (data && data.programId === "musicPlayer") {
          const musicPlayerButton = document.querySelector(
            '.taskbar-item[data-program-id="musicPlayer-window"]',
          );
          if (musicPlayerButton) {
            const textElement = musicPlayerButton.querySelector("span");
            const imgElement = musicPlayerButton.querySelector("img");
            if (textElement && imgElement) {
              const originalTitle = imgElement.alt;
              const existingIndicator = textElement.querySelector(
                ".music-playing-indicator",
              );
              if (existingIndicator) {
                textElement.innerHTML = originalTitle;
              }
            }
          }
        }
      }, 250); // Short delay to ensure taskbar item is in DOM before attempting to modify it
    });
  }

  /**
   * Sets up click event listeners for the Start button to toggle the Start Menu.
   * @returns {void} Nothing.
   * @private
   */
  setupStartButtonEffects() {
    this.startButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.eventBus.publish(EVENTS.STARTMENU_TOGGLE);
    });
  }

  /**
   * Initializes responsive behavior for the taskbar.
   * @description Calls `updateTaskbarLayout` initially and sets up listeners
   * for window resize and DOM changes within the programs container to
   * trigger layout updates.
   * @returns {void} Nothing.
   * @private
   */
  setupResponsiveTaskbar() {
    this.updateTaskbarLayout();

    window.addEventListener("resize", () => {
      this.updateTaskbarLayout();
    });

    const observer = new MutationObserver(() => {
      this.updateTaskbarLayout();
    });

    observer.observe(this.programsContainer, {
      childList: true,
      subtree: false,
    });
  }

  /**
   * Updates the layout of taskbar program items.
   * @description Calculates available width in the taskbar and determines the appropriate
   * layout mode (default, compact text, or icon only) for program items.
   * Then applies this layout to ensure items fit and the taskbar remains usable.
   * @returns {void} Nothing.
   * @private
   */
  updateTaskbarLayout() {
    const taskbarItems = document.querySelectorAll(".taskbar-item");
    if (taskbarItems.length === 0) return;

    const availableWidth = this._calculateAvailableWidth();
    const layoutMode = this._determineLayoutMode(
      taskbarItems.length,
      availableWidth,
    );

    this._applyTaskbarLayout(taskbarItems, layoutMode, availableWidth);
  }

  /**
   * Calculates the available width for program items within the taskbar.
   * @returns {number} The width in pixels available for taskbar program items.
   * @private
   */
  _calculateAvailableWidth() {
    const taskbarWidth = this.taskbar.offsetWidth;
    const startButtonWidth = this.startButton.offsetWidth;
    const systemTrayWidth = this.systemTray.offsetWidth;
    return taskbarWidth - startButtonWidth - systemTrayWidth;
  }

  /**
   * Determines the appropriate layout mode for taskbar items based on count and available width.
   * @param {number} itemCount - The number of active taskbar items.
   * @param {number} availableWidth - The total width available for these items.
   * @returns {string} The layout mode: "default", "reduced", or "icon-only".
   * @private
   */
  _determineLayoutMode(itemCount, availableWidth) {
    const defaultWidth = 168; // Increased by 8px to match maxWidth
    const minTextWidth = 80;
    const iconOnlyWidth = 36;

    if (itemCount * defaultWidth <= availableWidth) return "default";
    if (itemCount * minTextWidth <= availableWidth) return "reduced";
    if (itemCount * iconOnlyWidth <= availableWidth) return "icon-only";
    return "overflow";
  }

  /**
   * Applies the determined layout mode to all taskbar items.
   * @description Sets the width of each taskbar item and toggles the "icon-only"
   * class based on the calculated `layoutMode` and `availableWidth`.
   * @param {NodeListOf<HTMLElement>} taskbarItems - The list of taskbar item elements.
   * @param {string} layoutMode - The layout mode ("default", "reduced", "icon-only", "overflow").
   * @param {number} availableWidth - The total width available for items.
   * @private
   */
  _applyTaskbarLayout(taskbarItems, layoutMode, availableWidth) {
    const minWidth = 36; // Minimum width for icon-only
    const maxWidth = 168; // Default max width (increased by 8px for desktop)
    const itemCount = taskbarItems.length;
    let itemWidth = Math.floor(availableWidth / itemCount);
    if (itemWidth > maxWidth) itemWidth = maxWidth;
    if (itemWidth < minWidth) itemWidth = minWidth;

    // If we hit icon-only width, add the icon-only class
    const useIconOnly = itemWidth === minWidth;

    taskbarItems.forEach((item) => {
      item.style.display = "flex";
      item.style.width = `${itemWidth}px`;
      item.classList.toggle("icon-only", useIconOnly);
    });
  }

  /**
   * Ensures the Start button image is set to the default desktop asset.
   * @description This method explicitly sets the `src` for the Start button's image.
   * It's called during initialization and on resize to maintain the correct image.
   * @private
   */
  _setStartButtonImage() {
    const img = this.startButton.querySelector("img");
    if (!img) return;
    img.src = "assets/gui/taskbar/start-button.webp";
  }
}

// --- Balloon Tooltip for Network Icon ---
/**
 * Stores timeout IDs for the network balloon tooltip to manage its appearance and dismissal.
 * @type {Array<number>}
 * @private
 */
let balloonTimeouts = [];

/**
 * Hides and removes the network connection balloon tooltip.
 * @param {boolean} [instant=false] - If true, removes the balloon immediately without animation.
 *                                    Otherwise, a fade-out animation is applied.
 * @returns {void} Nothing.
 * @exported Yes, this is an exported function.
 */
export function hideBalloon(instant = false) {
  const balloonRoot = document.getElementById("balloon-root");
  if (!balloonRoot) return;
  const balloon = balloonRoot.querySelector(".balloon");
  // Clear all timeouts to prevent old ones from firing after removal
  balloonTimeouts.forEach((t) => clearTimeout(t));
  balloonTimeouts = [];
  if (instant) {
    if (balloonRoot.parentNode) balloonRoot.parentNode.removeChild(balloonRoot);
    return;
  }
  if (balloon) balloon.classList.add("hide");
  setTimeout(() => {
    if (balloonRoot.parentNode) balloonRoot.parentNode.removeChild(balloonRoot);
  }, 1000);
}

/**
 * Displays a network connection balloon tooltip, typically anchored to the network tray icon.
 * @description Creates and shows a balloon notification. The content (header and body text)
 * is fetched from `system.json`. The balloon automatically hides after a delay.
 * Plays a sound effect when shown. Prevents multiple balloons from appearing.
 * Does not show if the login screen is active.
 * @async
 * @returns {Promise<void>} A promise that resolves when the function has completed its setup.
 * @exported Yes, this is an exported function.
 */
export async function showNetworkBalloon() {
  // Prevent balloon if login screen is visible
  const loginScreen = document.getElementById("login-screen");
  if (
    loginScreen &&
    loginScreen.style.display !== "none" &&
    loginScreen.style.opacity !== "0"
  )
    return;
  if (document.getElementById("balloon-root")) return;
  // Clear any previous balloon timeouts before showing a new one
  balloonTimeouts.forEach((t) => clearTimeout(t));
  balloonTimeouts = [];

  // Play the balloon sound
  if (balloonSound) {
    balloonSound.currentTime = 0;
    balloonSound
      .play()
      .catch((error) => console.error("Error playing balloon sound:", error));
  }

  const icon = document.querySelector(".tray-network-icon");
  if (!icon) return;
  const balloonRoot = document.createElement("div");
  balloonRoot.id = "balloon-root";
  balloonRoot.style.position = "absolute";
  balloonRoot.style.zIndex = "1400";
  document.body.appendChild(balloonRoot);

  // Fetch system.json for balloon content
  let headerText = "";
  let mainText = "";
  try {
    const response = await fetch("./system.json");
    const system = await response.json();
    if (system.balloon) {
      if (system.balloon.title) headerText = system.balloon.title;
      if (system.balloon.body) mainText = system.balloon.body;
    }
  } catch (e) {
    console.error("Error fetching system.json for balloon:", e);
  }

  balloonRoot.innerHTML = `
    <div class="balloon">
      <button class="balloon__close" aria-label="Close"></button>
      <div class="balloon__header">
        <img class="balloon__header__img" src="assets/gui/taskbar/welcome.webp" alt="welcome" />
        <span class="balloon__header__text">${headerText}</span>
      </div>
      <p class="balloon__text__first" style="padding: 0 8px 0 2px;">${mainText}</p>
      <p class="balloon__text__second" style="padding: 0 8px 0 2px; margin-top: 8px;">
        Get Started: <a href="#" id="balloon-about-link" style="color: blue; text-decoration: underline;">About Me</a> | <a href="#" id="balloon-projects-link" style="color: blue; text-decoration: underline;">My Projects</a>
      </p>
      <div class="balloon-pointer-anchor" style="position:absolute;bottom:-19px;right:24px;width:0;height:0;"></div>
    </div>
  `;

  // Add event listener for the new "My Projects" link
  const projectsLink = balloonRoot.querySelector("#balloon-projects-link");
  if (projectsLink) {
    projectsLink.addEventListener("click", (event) => {
      event.preventDefault(); // Prevent default link behavior

      if (taskbarSharedEventBus && EVENTS) {
        taskbarSharedEventBus.publish(EVENTS.PROGRAM_OPEN, {
          programName: "projects",
        });
      } else {
        console.error(
          "taskbarSharedEventBus or EVENTS not available for balloon link.",
        );
      }
    });
  }

  // Add event listener for the new "About Me" link
  const aboutLink = balloonRoot.querySelector("#balloon-about-link");
  if (aboutLink) {
    aboutLink.addEventListener("click", (event) => {
      event.preventDefault(); // Prevent default link behavior
      if (taskbarSharedEventBus && EVENTS) {
        taskbarSharedEventBus.publish(EVENTS.PROGRAM_OPEN, {
          programName: "about",
        });
      } else {
        console.error(
          "taskbarSharedEventBus or EVENTS not available for balloon link (About Me).",
        );
      }
    });
  }

  setTimeout(() => {
    const iconRect = icon.getBoundingClientRect();
    const balloon = balloonRoot.querySelector(".balloon");
    const pointerAnchor = balloon.querySelector(".balloon-pointer-anchor");
    // Use requestAnimationFrame to ensure DOM is rendered
    requestAnimationFrame(() => {
      const pointerRect = pointerAnchor.getBoundingClientRect();
      // Calculate the center of the icon
      const iconCenterX = iconRect.left + iconRect.width / 2 + window.scrollX;
      // Calculate the center of the pointer anchor
      const pointerCenterX =
        pointerRect.left + pointerRect.width / 2 + window.scrollX;
      // Adjust horizontally by -8px (left) and vertically by -12px (higher)
      const offsetX = iconCenterX - pointerCenterX - 8;
      balloonRoot.style.left = balloonRoot.offsetLeft + offsetX + "px";
      balloonRoot.style.top =
        iconRect.top - balloon.offsetHeight - 8 - 12 + window.scrollY + "px";
    });
  }, 0);
  const balloon = balloonRoot.querySelector(".balloon");
  const closeBtn = balloonRoot.querySelector(".balloon__close");
  closeBtn.onclick = () => hideBalloon();
  balloon.classList.remove("hide");

  const isMobile = isMobileDevice();
  const fadeOutDelay = isMobile ? 7000 : 10000; // 7s for mobile, 10s for desktop
  const removeDelay = isMobile ? 8000 : 11000; // 8s for mobile, 11s for desktop

  balloonTimeouts.push(
    setTimeout(() => balloon.classList.add("hide"), fadeOutDelay),
  );
  balloonTimeouts.push(setTimeout(() => hideBalloon(), removeDelay));
}

/**
 * Sets up a click event listener on the network tray icon to show the network balloon tooltip.
 * @private
 */
const setupBalloonClick = () => {
  const icon = document.querySelector(".tray-network-icon");
  if (!icon) return;
  icon.addEventListener("click", showNetworkBalloon);
};
window.addEventListener("DOMContentLoaded", () => {
  setupBalloonClick();
  const fullscreenIcon = document.querySelector(".tray-fullscreen-icon");
  if (fullscreenIcon) {
    fullscreenIcon.addEventListener("click", () => {
      hideBalloon(true); // Instantly hide the balloon when fullscreen is toggled
      // Try Fullscreen API first
      const docElm = document.documentElement;
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (docElm.requestFullscreen) {
        docElm.requestFullscreen();
      } else if (docElm.mozRequestFullScreen) {
        /* Firefox */
        docElm.mozRequestFullScreen();
      } else if (docElm.webkitRequestFullscreen) {
        /* Chrome, Safari & Opera */
        docElm.webkitRequestFullscreen();
      } else if (docElm.msRequestFullscreen) {
        /* IE/Edge */
        docElm.msRequestFullscreen();
      } else {
        // Fallback: try to send F11 (not reliable in browsers)
        alert("Press F11 to enter fullscreen mode.");
      }
    });
  }
});
