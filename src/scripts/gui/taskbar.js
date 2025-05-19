/**
 * taskbar.js — Taskbar Component for Windows XP Simulation
 *
 * Handles the taskbar UI, including:
 * - Start menu integration and toggling
 * - System tray and clock management
 * - Responsive layout and event-driven updates
 *
 * Usage:
 *   import Taskbar from './taskbar.js';
 *   const taskbar = new Taskbar(eventBus);
 *
 * Edge Cases:
 *   - If required DOM elements are missing, some features are disabled.
 *   - Tooltips and clock are initialized on startup.
 *
 * @module taskbar
 */
import StartMenu from "./startMenu.js";
import { EVENTS } from "../utils/eventBus.js";
import { setupTooltips } from "./tooltip.js"; // Corrected path from utils
import { isMobileDevice } from "../utils/device.js";

/**
 * Clock class for managing the system clock display and time updates.
 *
 * @class
 * @example
 * const clock = new Clock('.time');
 * clock.destroy(); // Stop updates
 */
class Clock {
  #clockElement;
  #intervalId = null;
  #initialTimeoutId = null;
  #timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  constructor(selector) {
    this.#clockElement = document.querySelector(selector);
    if (!this.#clockElement) {
      return;
    }
    this.setupClockUpdates();
  }

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

  updateClock() {
    if (!this.#clockElement) return;
    this.#clockElement.textContent = this.#timeFormatter.format(new Date());
  }

  destroy() {
    clearTimeout(this.#initialTimeoutId);
    clearInterval(this.#intervalId);
    this.#clockElement = null;
  }
}

/**
 * Taskbar manages the Windows XP taskbar UI, start menu, tray icons, and clock.
 *
 * @class
 * @example
 * import Taskbar from './taskbar.js';
 * const taskbar = new Taskbar(eventBus);
 */
export default class Taskbar {
  /**
   * Create a new Taskbar instance.
   * @param {EventBus} eventBus - The event bus instance for communication.
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.startButton = document.getElementById("start-button");
    this.startMenuComponent = new StartMenu(this.eventBus);
    this.programsContainer = document.querySelector(".taskbar-programs");
    this.systemTray = document.querySelector(".system-tray");
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

    // Listen for fullscreen changes to reset the network balloon
    document.addEventListener('fullscreenchange', () => {
      localStorage.removeItem("networkBalloonShown");
      // Adjust based on final requirements
      // Ensure it doesn't conflict with other UI elements
      // showNetworkBalloon(); // This might be too intrusive, depends on desired UX
    });
  }

  /**
   * Subscribe to event bus events
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
  }

  /**
   * Set up hover and click effects for start button
   */
  /**
   * Set up hover and click effects for the Start button.
   * @returns {void}
   */
  setupStartButtonEffects() {
    this.startButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.eventBus.publish(EVENTS.STARTMENU_TOGGLE);
    });
  }

  /**
   * Setup responsive taskbar that adjusts program item widths based on available space
   */
  /**
   * Set up responsive behavior for the taskbar on window resize.
   * @returns {void}
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
   * Updates the taskbar layout, adjusting program item widths based on available space
   * This ensures the taskbar remains usable and visually balanced regardless of window count.
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

  _calculateAvailableWidth() {
    const taskbarWidth = this.taskbar.offsetWidth;
    const startButtonWidth = this.startButton.offsetWidth;
    const systemTrayWidth = this.systemTray.offsetWidth;
    return taskbarWidth - startButtonWidth - systemTrayWidth;
  }

  _determineLayoutMode(itemCount, availableWidth) {
    const defaultWidth = 160;
    const minTextWidth = 80;
    const iconOnlyWidth = 36;

    if (itemCount * defaultWidth <= availableWidth) return "default";
    if (itemCount * minTextWidth <= availableWidth) return "reduced";
    if (itemCount * iconOnlyWidth <= availableWidth) return "icon-only";
    return "overflow";
  }

  _applyTaskbarLayout(taskbarItems, layoutMode, availableWidth) {
    const minWidth = 36; // Minimum width for icon-only
    const maxWidth = 160; // Default max width
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

  _setStartButtonImage() {
    const img = this.startButton.querySelector("img");
    if (!img) return;
    img.src = "assets/gui/taskbar/start-button.webp";
  }
}

// --- Balloon Tooltip for Network Icon ---
let balloonTimeouts = [];

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

export function showNetworkBalloon() {
  // Prevent balloon if login screen is visible
  const loginScreen = document.getElementById("login-screen");
  if (loginScreen && loginScreen.style.display !== "none" && loginScreen.style.opacity !== "0") return;
  if (document.getElementById("balloon-root")) return;
  // Clear any previous balloon timeouts before showing a new one
  balloonTimeouts.forEach((t) => clearTimeout(t));
  balloonTimeouts = [];
  const icon = document.querySelector(".tray-network-icon");
  if (!icon) return;
  const balloonRoot = document.createElement("div");
  balloonRoot.id = "balloon-root";
  balloonRoot.style.position = "absolute";
  balloonRoot.style.zIndex = "1400";
  document.body.appendChild(balloonRoot);

  const headerText = "Welcome to my portfolio";
  const mainText = "It's also the world's best XP recreation.<br>Built from scratch, to the pixel, by me.";

  balloonRoot.innerHTML = `
    <div class="balloon">
      <button class="balloon__close" aria-label="Close"></button>
      <div class="balloon__header">
        <img class="balloon__header__img" src="assets/gui/taskbar/welcome.webp" alt="welcome" />
        <span class="balloon__header__text">${headerText}</span>
      </div>
      <p class="balloon__text__first" style="padding: 0 8px 0 2px;">${mainText}</p>
      <div class="balloon-pointer-anchor" style="position:absolute;bottom:-19px;right:24px;width:0;height:0;"></div>
    </div>
  `;
  setTimeout(() => {
    const iconRect = icon.getBoundingClientRect();
    const balloon = balloonRoot.querySelector(".balloon");
    const balloonRect = balloon.getBoundingClientRect();
    const pointerAnchor = balloon.querySelector(".balloon-pointer-anchor");
    const pointerRect = pointerAnchor.getBoundingClientRect();
    // Calculate the center of the icon
    const iconCenterX = iconRect.left + iconRect.width / 2 + window.scrollX;
    // Calculate the position of the pointer within the balloon
    const pointerX = pointerRect.left + window.scrollX;
    // Calculate the difference
    const offsetX = iconCenterX - pointerX;
    // Adjust for scale transform (0.93)
    const scale = 0.93;
    const deltaX = (balloonRect.width * (scale - 1)) / 2;
    // Set the balloon position so the pointer aligns with the icon center
    balloonRoot.style.left = balloonRect.left + offsetX - deltaX - 24 - 2 + "px";
    balloonRoot.style.top =
      iconRect.top - balloonRect.height - 22 - 2 + window.scrollY + "px";
  }, 0);
  const balloon = balloonRoot.querySelector(".balloon");
  const closeBtn = balloonRoot.querySelector(".balloon__close");
  closeBtn.onclick = () => hideBalloon();
  balloon.classList.remove("hide");

  const isMobile = isMobileDevice();
  const fadeOutDelay = isMobile ? 7000 : 10000; // 7s for mobile, 10s for desktop
  const removeDelay = isMobile ? 8000 : 11000;   // 8s for mobile, 11s for desktop

  balloonTimeouts.push(setTimeout(() => balloon.classList.add("hide"), fadeOutDelay));
  balloonTimeouts.push(setTimeout(() => hideBalloon(), removeDelay));
}

// Instead, show balloon on click of the network icon
const setupBalloonClick = () => {
  const icon = document.querySelector(".tray-network-icon");
  if (!icon) return;
  icon.addEventListener("click", showNetworkBalloon);
};
window.addEventListener("DOMContentLoaded", () => {
  setupBalloonClick();
  const fullscreenIcon = document.querySelector('.tray-fullscreen-icon');
  if (fullscreenIcon) {
    fullscreenIcon.addEventListener('click', () => {
      hideBalloon(true); // Instantly hide the balloon when fullscreen is toggled
      // Try Fullscreen API first
      const docElm = document.documentElement;
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (docElm.requestFullscreen) {
        docElm.requestFullscreen();
      } else if (docElm.mozRequestFullScreen) { /* Firefox */
        docElm.mozRequestFullScreen();
      } else if (docElm.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
        docElm.webkitRequestFullscreen();
      } else if (docElm.msRequestFullscreen) { /* IE/Edge */
        docElm.msRequestFullscreen();
      } else {
        // Fallback: try to send F11 (not reliable in browsers)
        alert('Press F11 to enter fullscreen mode.');
      }
    });
  }
});
