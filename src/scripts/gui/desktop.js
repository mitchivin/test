/**
 * @fileoverview Desktop Component for the Windows XP simulation.
 * Manages desktop icons, selection, drag, and wallpaper logic.
 *
 * Usage:
 *   import Desktop from './desktop.js';
 *   const desktop = new Desktop(eventBus);
 *
 * Edge Cases:
 *   - If .desktop element is missing, most functionality is disabled.
 *   - If there are no .desktop-icon elements, icon logic is skipped.
 *   - Wallpaper selection adapts to ultrawide screens.
 */
import { EVENTS } from "../utils/eventBus.js";
import { isMobileDevice } from "../utils/device.js";

/**
 * Desktop class manages the Windows XP desktop UI, including icon selection, drag, and wallpaper.
 *
 * @class
 * @example
 * import Desktop from './desktop.js';
 * const desktop = new Desktop(eventBus);
 */
export default class Desktop {
  /**
   * Create a new Desktop instance.
   * @param {EventBus} eventBus - The event bus instance for communication.
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.desktop = document.querySelector(".desktop");
    this.selectionBox = null;
    this.isDragging = false;
    this.hasDragged = false;
    this.startX = 0;
    this.startY = 0;
    this.lastClickTimes = {};
    this.selectedIcons = new Set();

    this.cleanupArtifacts();
    this.createSelectionOverlay();
    this.setupIconEvents();
    this.setupDesktopEvents();
    this.setupPointerSelectionEvents();

    // Set the default wallpaper class
    this.desktop.classList.remove('wallpaper-default', 'wallpaper-mobile'); // Clear existing first
    if (isMobileDevice()) {
      this.desktop.classList.add('wallpaper-mobile');
    } else {
      this.desktop.classList.add('wallpaper-default');
    }

    // Set background position class for ultrawide screens
    this.desktop.classList.remove('bg-pos-ultrawide'); // Clear existing first
    const aspectRatio = window.innerWidth / window.innerHeight;
    if (aspectRatio > 2.3) {
      // 21:9 is ~2.33
      this.desktop.classList.add('bg-pos-ultrawide');
    }
    // No 'else' needed if the default classes handle the non-ultrawide case

    this.eventBus.subscribe(EVENTS.WINDOW_CREATED, () => this.clearSelection());
    this.eventBus.subscribe(EVENTS.WINDOW_FOCUSED, () => this.clearSelection());
  }

  /**
   * Helper to always get the current set of desktop icons.
   * @returns {NodeListOf<Element>} NodeList of .desktop-icon elements
   */
  getIcons() {
    return this.desktop.querySelectorAll(".desktop-icon");
  }

  // Utility: Selection overlay for desktop icons
  /**
   * Remove any existing selection box artifacts from previous interactions.
   * @returns {void}
   */
  cleanupArtifacts() {
    document
      .querySelectorAll("#selection-box, .selection-box")
      .forEach((box) => box.remove());
  }

  /**
   * Create the selection overlay element if it does not exist.
   * @returns {void}
   */
  createSelectionOverlay() {
    if (!this.overlay) {
      this.overlay = document.createElement("div");
      this.overlay.className = "selection-overlay";
      this.desktop.prepend(this.overlay);
    }
  }

  /**
   * Attach click and interaction events to desktop icons.
   * @returns {void}
   */
  setupIconEvents() {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.getIcons().forEach((icon) => {
      // If the icon is an anchor (for social links), let the default action happen
      if (icon.tagName === "A") return;
      const iconSpan = icon.querySelector("span");
      const iconId = iconSpan
        ? iconSpan.textContent.trim().toLowerCase().replace(/\s+/g, "-")
        : "";

      // Combined click/tap handling for selection and opening
      const handleIconActivate = (e) => {
        e.stopPropagation();
        // Prevent both click and touchend from firing for the same tap
        if (isTouch && e.type === "click") return;
        const now = Date.now();
        const DOUBLE_CLICK_THRESHOLD = 400; // ms
        const lastTime = this.lastClickTimes[iconId] || 0;

        if (now - lastTime < DOUBLE_CLICK_THRESHOLD) {
          // This is a double-click/tap
          if (!icon.classList.contains("selected")) {
            this.selectIcon(icon, true);
          }
          let programName = icon.getAttribute("data-program-name");
          // Special case: social icons in .desktop-icons-top
          if (
            icon.closest(".desktop-icons-top") &&
            ["github", "instagram", "behance", "linkedin"].includes(programName)
          ) {
            const urls = {
              github: "https://github.com/mitchivin",
              instagram: "https://www.instagram.com/mitchivin",
              behance: "https://www.behance.net/mitch_ivin",
              linkedin: "https://www.linkedin.com/in/mitchivin",
            };
            window.open(urls[programName], "_blank");
          } else {
            this.eventBus.publish(EVENTS.PROGRAM_OPEN, { programName });
          }

          // Reset last click time to prevent triple click issues
          this.lastClickTimes[iconId] = 0;
        } else {
          // This is a single click/tap
          this.toggleIconSelection(icon, e.ctrlKey);
          // Record the time for potential double-click detection
          this.lastClickTimes[iconId] = now;
        }
      };

      if (isTouch) {
        icon.addEventListener("touchend", handleIconActivate);
      } else {
        icon.addEventListener("click", handleIconActivate);
      }
    });
  }

  /**
   * Attach click handler to desktop background for clearing selection.
   * @returns {void}
   */
  setupDesktopEvents() {
    this.desktop.addEventListener("click", (e) => {
      if (e.target === this.desktop || e.target === this.overlay) {
        if (!this.isDragging && !this.hasDragged) {
          this.clearSelection();
        }
      }
    });
  }

  /**
   * Set up pointer events for click-and-drag selection of desktop icons.
   * Handles pointerdown, pointermove, pointerup for selection box.
   * @returns {void}
   */
  setupPointerSelectionEvents() {
    window.addEventListener("pointerdown", (e) => {
      if (e.target !== this.overlay && e.target !== this.desktop) return;
      if (!e.ctrlKey) {
        this.clearSelection();
      }
      const rect = this.desktop.getBoundingClientRect();
      this.startX = e.clientX - rect.left;
      this.startY = e.clientY - rect.top;
      this.clearTemporaryHighlights();
      this.selectionBox = document.createElement("div");
      this.selectionBox.className = "selection-box";
      Object.assign(this.selectionBox.style, {
        left: `${this.startX}px`,
        top: `${this.startY}px`,
        width: "0px",
        height: "0px",
      });
      this.desktop.appendChild(this.selectionBox);
      this.isDragging = true;
      this.hasDragged = false;
    });
    window.addEventListener("pointermove", (e) => {
      if (!this.isDragging || !this.selectionBox) return;
      this.hasDragged = true;
      const rect = this.desktop.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      const x = Math.min(currentX, this.startX);
      const y = Math.min(currentY, this.startY);
      const w = Math.abs(currentX - this.startX);
      const h = Math.abs(currentY - this.startY);
      Object.assign(this.selectionBox.style, {
        left: `${x}px`,
        top: `${y}px`,
        width: `${w}px`,
        height: `${h}px`,
      });
      this.highlightIconsIntersecting(x, y, w, h);
    });
    window.addEventListener("pointerup", () => {
      if (!this.isDragging || !this.selectionBox) return;
      this.isDragging = false;
      this.getIcons().forEach((icon) => {
        if (icon.classList.contains("hover-by-selection")) {
          icon.classList.remove("hover-by-selection");
          icon.classList.add("selected");
          this.selectedIcons.add(icon);
        }
      });
      if (this.selectionBox?.parentNode) {
        this.selectionBox.parentNode.removeChild(this.selectionBox);
        this.selectionBox = null;
      }
    });
  }

  /**
   * Highlight desktop icons that intersect with the selection rectangle.
   * Uses bounding box intersection logic to determine which icons are selected.
   * @param {number} left - Left X of selection box (relative to desktop)
   * @param {number} top - Top Y of selection box (relative to desktop)
   * @param {number} width - Width of selection box
   * @param {number} height - Height of selection box
   * @returns {void}
   */
  highlightIconsIntersecting(left, top, width, height) {
    const selectionRect = {
      left,
      top,
      right: left + width,
      bottom: top + height,
    };
    this.getIcons().forEach((icon) => {
      const rect = icon.getBoundingClientRect();
      const desktopRect = this.desktop.getBoundingClientRect();
      const iconRect = {
        left: rect.left - desktopRect.left,
        top: rect.top - desktopRect.top,
        right: rect.right - desktopRect.left,
        bottom: rect.bottom - desktopRect.top,
      };
      const intersects = !(
        iconRect.right < selectionRect.left ||
        iconRect.left > selectionRect.right ||
        iconRect.bottom < selectionRect.top ||
        iconRect.top > selectionRect.bottom
      );
      if (intersects) {
        icon.classList.add("hover-by-selection");
      } else {
        icon.classList.remove("hover-by-selection");
      }
    });
  }

  toggleIconSelection(icon, isCtrlPressed) {
    if (isCtrlPressed) {
      if (icon.classList.contains("selected")) {
        icon.classList.remove("selected");
        this.selectedIcons.delete(icon);
      } else {
        icon.classList.add("selected");
        this.selectedIcons.add(icon);
      }
    } else {
      this.clearSelection();
      icon.classList.add("selected");
      this.selectedIcons.add(icon);
    }
  }

  selectIcon(icon, clearOthers = true) {
    if (clearOthers) this.clearSelection();
    icon.classList.add("selected");
    this.selectedIcons.add(icon);
  }

  clearSelection() {
    this.getIcons().forEach((icon) => {
      icon.classList.remove("selected", "hover-by-selection");
    });
    this.selectedIcons.clear();
  }

  clearTemporaryHighlights() {
    this.getIcons().forEach((icon) =>
      icon.classList.remove("hover-by-selection"),
    );
  }
}
