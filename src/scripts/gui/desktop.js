/**
 * desktop.js — Desktop Component for Windows XP Simulation
 *
 * Handles the desktop UI, including:
 * - Icon rendering, selection, and drag selection
 * - Wallpaper logic (desktop/mobile)
 * - Event-driven integration with the rest of the system
 *
 * Usage:
 *   import Desktop from './desktop.js';
 *   const desktop = new Desktop(eventBus);
 *
 * @module desktop
 */
import { EVENTS } from "../utils/eventBus.js";
import { isMobileDevice } from "../utils/device.js";

// ===== Desktop Class =====
/**
 * Manages the Windows XP desktop UI: icons, selection, drag, and wallpaper.
 */
export default class Desktop {
  /**
   * @param {EventBus} eventBus - Event bus for cross-component communication
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
    this.activeDragPointerId = null;

    this.cleanupArtifacts();
    this.createSelectionOverlay();
    this.setupIconEvents();
    this.setupDesktopEvents();
    this.setupPointerSelectionEvents();

    // Set wallpaper class based on device
    this.desktop.classList.remove('wallpaper-default', 'wallpaper-mobile');
    if (isMobileDevice()) {
      this.desktop.classList.add('wallpaper-mobile');
    } else {
      this.desktop.classList.add('wallpaper-default');
    }

    // Event subscriptions for selection/drag state
    this.eventBus.subscribe(EVENTS.WINDOW_CREATED, () => this.clearSelection());
    this.eventBus.subscribe(EVENTS.WINDOW_FOCUSED, () => this.clearSelection());
    this.eventBus.subscribe(EVENTS.PROGRAM_OPEN, () => this.resetDragSelectionState());
    this.eventBus.subscribe(EVENTS.STARTMENU_OPENED, () => this.resetDragSelectionState());
  }

  /**
   * Get all desktop icon elements.
   * @returns {NodeListOf<Element>} NodeList of .desktop-icon elements
   */
  getIcons() {
    return this.desktop.querySelectorAll(".desktop-icon");
  }

  /**
   * Remove any selection box artifacts from previous interactions.
   */
  cleanupArtifacts() {
    document.querySelectorAll("#selection-box, .selection-box").forEach((box) => box.remove());
  }

  /**
   * Create the selection overlay element if it does not exist.
   */
  createSelectionOverlay() {
    if (!this.overlay) {
      this.overlay = document.createElement("div");
      this.overlay.className = "selection-overlay";
      this.desktop.prepend(this.overlay);
    }
  }

  /**
   * Attach click/tap events to desktop icons for selection and opening.
   */
  setupIconEvents() {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.getIcons().forEach((icon) => {
      if (icon.tagName === "A") return; // Let anchors handle their own events
      const iconSpan = icon.querySelector("span");
      const iconId = iconSpan ? iconSpan.textContent.trim().toLowerCase().replace(/\s+/g, "-") : "";
      const handleIconActivate = (e) => {
        e.stopPropagation();
        if (isTouch && e.type === "click") return; // Prevent double event on touch
        const now = Date.now();
        const DOUBLE_CLICK_THRESHOLD = 400;
        const lastTime = this.lastClickTimes[iconId] || 0;
        if (now - lastTime < DOUBLE_CLICK_THRESHOLD) {
          // Double-click/tap: open program or social link
          if (!icon.classList.contains("selected")) this.selectIcon(icon, true);
          let programName = icon.getAttribute("data-program-name");
          const socialKeys = ["github", "instagram", "behance", "linkedin"];
          if (socialKeys.includes(programName)) {
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
          this.lastClickTimes[iconId] = 0;
        } else {
          // Single click/tap: select icon
          this.toggleIconSelection(icon, e.ctrlKey);
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
   */
  setupPointerSelectionEvents() {
    window.addEventListener("pointerdown", (e) => {
      if (e.target !== this.overlay && e.target !== this.desktop) return;
      if (isMobileDevice()) {
        // Multi-touch or stuck drag: reset state
        if (this.activeDragPointerId !== null && this.activeDragPointerId !== e.pointerId) {
          this.resetDragSelectionState();
        } else if (this.isDragging && this.activeDragPointerId === e.pointerId) {
          this.resetDragSelectionState();
        }
      }
      if (this.isDragging) return;
      if (!e.ctrlKey) this.clearSelection();
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
      this.activeDragPointerId = e.pointerId;
    });
    window.addEventListener("pointermove", (e) => {
      if (!this.isDragging || !this.selectionBox) return;
      if (isMobileDevice() && e.pointerId !== this.activeDragPointerId) return;
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
    window.addEventListener("pointerup", (e) => {
      if (!this.isDragging || !this.selectionBox) return;
      if (isMobileDevice() && e.pointerId !== this.activeDragPointerId) return;
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
      this.activeDragPointerId = null;
    });
  }

  /**
   * Highlight desktop icons that intersect with the selection rectangle.
   * @param {number} left - Left X of selection box (relative to desktop)
   * @param {number} top - Top Y of selection box (relative to desktop)
   * @param {number} width - Width of selection box
   * @param {number} height - Height of selection box
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

  /**
   * Toggle selection state for an icon (supports ctrl multi-select).
   */
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

  /**
   * Select a single icon, optionally clearing others.
   */
  selectIcon(icon, clearOthers = true) {
    if (clearOthers) this.clearSelection();
    icon.classList.add("selected");
    this.selectedIcons.add(icon);
  }

  /**
   * Clear all icon selection and highlights.
   */
  clearSelection() {
    this.getIcons().forEach((icon) => {
      icon.classList.remove("selected", "hover-by-selection");
    });
    this.selectedIcons.clear();
  }

  /**
   * Remove temporary selection highlights from icons.
   */
  clearTemporaryHighlights() {
    this.getIcons().forEach((icon) =>
      icon.classList.remove("hover-by-selection"),
    );
  }

  /**
   * Forcefully reset any ongoing drag selection state.
   * Useful for cleaning up after interrupted interactions.
   */
  resetDragSelectionState() {
    this.isDragging = false;
    this.hasDragged = false;
    this.activeDragPointerId = null;
    if (this.selectionBox && this.selectionBox.parentNode) {
      this.selectionBox.parentNode.removeChild(this.selectionBox);
      this.selectionBox = null;
    }
    this.clearTemporaryHighlights();
  }
}
