/**
 * @fileoverview Taskbar module for managing the Windows XP start menu, system tray, and clock.
 * Integrates with StartMenu, EventBus, and tooltip utilities.
 *
 * Usage:
 *   import Taskbar from './taskbar.js';
 *   const taskbar = new Taskbar(eventBus);
 *
 * Edge Cases:
 *   - If required DOM elements are missing, some features are disabled.
 *   - Tooltips and clock are initialized on startup.
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
    this.taskbar = document.querySelector(".taskbar"); // Cache taskbar

    // Always use the desktop start button asset
    this._setStartButtonImage();
    window.addEventListener("resize", () => this._setStartButtonImage());

    this.setupStartButtonEffects();
    this.setupResponsiveTaskbar();

    // Call the new utility function for system tray icons
    setupTooltips(
      ".tray-status-icon, .tray-network-icon, .tray-volume-icon",
      undefined,
      100,
      // Prevent tooltip if balloon is active
      () => !document.getElementById("balloon-root"),
    );

    // Initialize the clock
    new Clock(".time");

    this.subscribeToEvents();
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
export function showNetworkBalloon() {
  // Prevent balloon if login screen is visible
  const loginScreen = document.getElementById("login-screen");
  if (loginScreen && loginScreen.style.display !== "none" && loginScreen.style.opacity !== "0") return;
  if (document.getElementById("balloon-root")) return;
  const icon = document.querySelector(".tray-network-icon");
  if (!icon) return;
  const balloonRoot = document.createElement("div");
  balloonRoot.id = "balloon-root";
  balloonRoot.style.position = "absolute";
  balloonRoot.style.zIndex = "10010";
  document.body.appendChild(balloonRoot);
  const isMobile = isMobileDevice && isMobileDevice();
  const headerText = "Welcome to my Portfolio";
  const mainText = isMobile
    ? "Hey, I'm Mitch - I thought I'd mix things up a bit.<br>For the best experience, view this site on desktop."
    : "Hey, I'm Mitch - I thought i'd mix things up a bit.<br>Deliberately different. Meant to be explored.";
  balloonRoot.innerHTML = `
    <div class="balloon">
      <button class="balloon__close" aria-label="Close"></button>
      <div class="balloon__header">
        <img class="balloon__header__img" src="assets/gui/taskbar/welcome.webp" alt="welcome" />
        <span class="balloon__header__text">${headerText}</span>
      </div>
      <p class="balloon__text__first">${mainText}</p>
      <div class="balloon-pointer-anchor" style="position:absolute;bottom:-19px;right:14px;width:0;height:0;"></div>
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
    balloonRoot.style.left = balloonRect.left + offsetX - deltaX - 18 + "px";
    balloonRoot.style.top =
      iconRect.top - balloonRect.height - 22 + window.scrollY + "px";
  }, 0);
  const balloon = balloonRoot.querySelector(".balloon");
  const closeBtn = balloonRoot.querySelector(".balloon__close");
  let balloonTimeouts = [];
  closeBtn.onclick = () => hideBalloon();
  // Remove balloon.onclick handler so clicking the balloon does nothing
  balloon.classList.remove("hide");
  balloonTimeouts.push(setTimeout(() => balloon.classList.add("hide"), 7000)); // Start fade out after 7s
  balloonTimeouts.push(setTimeout(() => hideBalloon(), 8000)); // Remove after 8s
  function hideBalloon() {
    balloon.classList.add("hide");
    balloonTimeouts.push(setTimeout(() => clearBalloon(), 1000));
  }
  function clearBalloon() {
    balloonTimeouts.forEach((t) => clearTimeout(t));
    balloonTimeouts = [];
    if (balloonRoot.parentNode) balloonRoot.parentNode.removeChild(balloonRoot);
  }
}

// Remove the DOMContentLoaded event for auto-show
// Instead, show balloon on click of the network icon
const setupBalloonClick = () => {
  const icon = document.querySelector(".tray-network-icon");
  if (!icon) return;
  icon.addEventListener("click", showNetworkBalloon);
};
window.addEventListener("DOMContentLoaded", () => {
  setupBalloonClick();
});
