/**
 * @fileoverview Desktop manager for Windows XP simulation.
 * @description Manages desktop icons, wallpaper, selection logic, and event integration.
 *              Handles icon rendering from data sources, drag-to-select functionality,
 *              double-click/tap to open, and background updates based on device type.
 * @module scripts/gui/desktop
 * @file src/scripts/gui/desktop.js
 * @see {@link module:scripts/utils/eventBus.EVENTS} for relevant event types.
 */
import { EVENTS } from "../utils/eventBus.js";
import { isMobileDevice } from "../utils/device.js";

// ===== Helper Functions =====

/** @type {Array<object> | null} Cache for social media link data loaded from `info.json`. */
let SOCIALS_CACHE = null;
/**
 * Fetches social media link data from `info.json`.
 * Implements a simple cache (`SOCIALS_CACHE`) to avoid redundant fetches.
 * @async
 * @private
 * @function getSocials
 * @returns {Promise<Array<object>>} A promise that resolves to an array of social objects.
 *                                   Each object typically contains `key`, `name`, `url`, `icon`.
 *                                   Returns an empty array on fetch failure.
 */
async function getSocials() {
  // Return cached data if available
  if (SOCIALS_CACHE) return SOCIALS_CACHE;
  try {
    const response = await fetch("./info.json");
    const info = await response.json();
    // Ensure socials is an array, default to empty array if not or if fetch fails
    SOCIALS_CACHE = Array.isArray(info.socials) ? info.socials : [];
    return SOCIALS_CACHE;
  } catch (e) {
    console.error("Failed to fetch or parse socials from info.json:", e);
    SOCIALS_CACHE = []; // Ensure cache is an empty array on error
    return SOCIALS_CACHE;
  }
}

/** @type {object | null} Cache for system assets (e.g., wallpaper paths) loaded from `system.json`. */
let SYSTEM_ASSETS = null;
/**
 * Fetches system asset data (e.g., wallpaper paths) from `system.json`.
 * Implements a simple cache (`SYSTEM_ASSETS`) to avoid redundant fetches.
 * @async
 * @private
 * @function getSystemAssets
 * @returns {Promise<object>} A promise that resolves to the system assets object.
 *                            Returns an empty object on fetch failure.
 */
async function getSystemAssets() {
  // Return cached data if available
  if (SYSTEM_ASSETS) return SYSTEM_ASSETS;
  try {
    const response = await fetch("./system.json");
    SYSTEM_ASSETS = await response.json();
    return SYSTEM_ASSETS;
  } catch (e) {
    console.error("Failed to fetch system.json:", e);
    SYSTEM_ASSETS = {}; // Ensure cache is an empty object on error
    return SYSTEM_ASSETS;
  }
}

// ===== Desktop Class =====
/**
 * @class Desktop
 * @description Manages the primary desktop user interface, including icons (loading, rendering, interaction),
 * wallpaper (dynamic based on device), selection logic (click, drag-to-select), and interactions.
 * It integrates with the global event bus to respond to and influence system-wide events.
 */
export default class Desktop {
  /**
   * Constructs the Desktop manager.
   * Initializes properties for managing desktop elements, selection state, drag operations,
   * and event handling. Sets up initial desktop state including wallpaper and icons.
   * @param {EventBus} eventBus - The global event bus instance for inter-component communication.
   * @see {@link module:scripts/utils/eventBus.EventBus}
   */
  constructor(eventBus) {
    /** @type {EventBus} The global event bus. Used for cross-component communication. */
    this.eventBus = eventBus;
    /** @type {HTMLElement} The main desktop DOM element. This is the root container for all desktop icons and the wallpaper. */
    this.desktop = document.querySelector(".desktop");
    /** @type {HTMLElement | null} The visual selection box element used during drag-select. Dynamically created and removed. */
    this.selectionBox = null;
    /** @type {boolean} Flag indicating if a drag-selection operation is currently active (pointer is down and moving). */
    this.isDragging = false;
    /** @type {boolean} Flag indicating if a drag has actually occurred (pointer moved significantly) since pointerdown. Helps differentiate clicks from drags. */
    this.hasDragged = false;
    /** @type {number} The X coordinate of the pointerdown event, relative to the desktop, used as the starting point for drag-select. */
    this.startX = 0;
    /** @type {number} The Y coordinate of the pointerdown event, relative to the desktop, used as the starting point for drag-select. */
    this.startY = 0;
    /** @type {Object.<string, number>} Stores the timestamp of the last click on an icon, keyed by icon ID. Used for double-click detection. */
    this.lastClickTimes = {};
    /** @type {Set<HTMLElement>} A set of currently selected desktop icon elements. Provides efficient add/delete/check operations. */
    this.selectedIcons = new Set();
    /** @type {number | null} Stores the pointerId of the active pointer during a drag operation. Critical for multi-touch handling to avoid conflicts. */
    this.activeDragPointerId = null;

    // --- Initialization and Setup ---
    this.cleanupArtifacts(); // Remove any stray selection boxes from previous state.
    this.createSelectionOverlay(); // Create the invisible overlay for initiating drag selections.

    // Asynchronously load social media links. Once loaded, update the desktop icons
    // that represent these social links (e.g., setting their images) and then
    // set up the necessary event listeners (like click/tap) for all icons.
    getSocials().then((socials) => {
      /** @type {Array<object>} Array of social media link objects, fetched from `info.json`. Each object contains details like name, URL, and icon path. */
      this.socials = socials;
      this.updateSocialDesktopIcons(); // Update icon images based on fetched social data.
      this.setupIconEvents(); // Setup click/tap listeners for icons.
    });

    this.setupDesktopEvents(); // Setup click listener for the desktop background itself (to clear selections).
    this.setupPointerSelectionEvents(); // Setup listeners for drag-to-select functionality.

    // Set desktop wallpaper class based on device type (mobile or default).
    // This allows for different default wallpapers to be applied via CSS.
    this.desktop.classList.remove("wallpaper-default", "wallpaper-mobile");
    if (isMobileDevice()) {
      this.desktop.classList.add("wallpaper-mobile");
    } else {
      this.desktop.classList.add("wallpaper-default");
    }

    // Subscribe to global events to manage icon selection state.
    // For example, clear icon selection when a new window is created or an existing one is focused,
    // or when a program/start menu opens, reset any drag selection in progress.
    this.eventBus.subscribe(EVENTS.WINDOW_CREATED, () => this.clearSelection());
    this.eventBus.subscribe(EVENTS.WINDOW_FOCUSED, () => this.clearSelection());
    // Reset drag selection state (e.g., remove selection box) if a program opens or start menu opens.
    this.eventBus.subscribe(EVENTS.PROGRAM_OPEN, () =>
      this.resetDragSelectionState(),
    );
    this.eventBus.subscribe(EVENTS.STARTMENU_OPENED, () =>
      this.resetDragSelectionState(),
    );

    // Asynchronously fetch system assets (like wallpaper paths) and set the desktop background image.
    // This ensures the correct wallpaper (mobile or desktop version) is loaded.
    getSystemAssets().then((system) => {
      if (isMobileDevice() && system.wallpaperMobile) {
        this.desktop.style.backgroundImage = `url('${system.wallpaperMobile}')`;
      } else if (system.wallpaperDesktop) {
        // Default to desktop wallpaper if not mobile or mobile specific not found
        this.desktop.style.backgroundImage = `url('${system.wallpaperDesktop}')`;
      }
    });
  }

  // --- Icon Management ---
  /**
   * Retrieves all desktop icon elements from the DOM.
   * @returns {NodeListOf<Element>} A NodeList of all elements with the class `.desktop-icon`.
   */
  getIcons() {
    return this.desktop.querySelectorAll(".desktop-icon");
  }

  /**
   * Removes any selection box DOM artifacts from previous interactions.
   * This ensures a clean state, especially if a drag operation was interrupted or the page was reloaded unexpectedly.
   * @returns {void} Nothing.
   */
  cleanupArtifacts() {
    // Query for elements by ID or class that might represent old selection boxes.
    document
      .querySelectorAll("#selection-box, .selection-box")
      .forEach((box) => box.remove());
  }

  /**
   * Creates the selection overlay element if it doesn't already exist.
   * This overlay is an invisible div covering the desktop, used to capture pointerdown events
   * for initiating drag-to-select operations without interfering with icon clicks directly.
   * If the overlay already exists, this function does nothing.
   * @returns {void} Nothing.
   */
  createSelectionOverlay() {
    if (!this.overlay) {
      /** @type {HTMLElement} Invisible overlay for capturing desktop-wide pointer events for selection. Positioned to cover the desktop. */
      this.overlay = document.createElement("div");
      this.overlay.className = "selection-overlay"; // Styled to be transparent and cover the desktop.
      this.desktop.prepend(this.overlay); // Prepend to be behind icons if z-index isn't managed, or to cover if it is.
    }
  }

  /**
   * Updates the source (`src`) and alt text of desktop icons that correspond to social media links.
   * Uses the `this.socials` data (fetched from `info.json`) to find matching icons by `data-program-name`.
   * Ensures correct path formatting for icon images, prepending "./" and handling potential duplicate slashes or dots.
   * @returns {void} Nothing.
   */
  updateSocialDesktopIcons() {
    if (!this.socials) return; // Do nothing if social data isn't loaded.
    this.socials.forEach((social) => {
      // Find the <img> tag within the icon element matching the social key.
      const iconEl = this.desktop.querySelector(
        `.desktop-icon[data-program-name="${social.key}"] img`,
      );
      if (iconEl && social.icon) {
        // Construct the correct path for the icon image.
        // Prepends "./" and ensures no double slashes or duplicated initial dots if `social.icon` already has them.
        const iconPath =
          "./" + social.icon.replace(/^\.\//, "").replace(/^\//, "");
        iconEl.src = iconPath;
        iconEl.alt = social.name; // Set alt text for accessibility.
      }
    });
  }

  /**
   * Attaches click (for mouse) and touchend (for touch devices) event listeners to all desktop icons.
   * Handles logic for single click/tap (to select an icon) and double click/tap (to open a program or social media link).
   * Uses a timestamp-based approach (`lastClickTimes` and `DOUBLE_CLICK_THRESHOLD`) to detect double interactions.
   * Differentiates between touch and mouse events to prevent double handling on touch devices.
   * @returns {void} Nothing.
   */
  setupIconEvents() {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    // Create a lookup object for social data by key for efficient access.
    const socialsByKey = (this.socials || []).reduce((acc, s) => {
      acc[s.key] = s;
      return acc;
    }, {});

    this.getIcons().forEach((icon) => {
      // If the icon is an anchor tag, let the browser handle its default behavior (e.g., navigating to href).
      if (icon.tagName === "A") return;

      const iconSpan = icon.querySelector("span"); // Icon text is usually in a span.
      // Generate a unique ID for the icon based on its text content (if available) for double-click tracking.
      // This ID is used as a key in `this.lastClickTimes`.
      const iconId = iconSpan
        ? iconSpan.textContent.trim().toLowerCase().replace(/\s+/g, "-")
        : ""; // Fallback if no span or text.

      /**
       * Handles activation of a desktop icon (click or touchend).
       * Differentiates between single and double interactions to select or open associated content.
       * @param {Event} e - The event object (MouseEvent or TouchEvent).
       * @private
       */
      const handleIconActivate = (e) => {
        e.stopPropagation(); // Prevent event from bubbling to desktop background listeners.
        // On touch devices, `click` events are often fired after `touchend`.
        // This check prevents handling the same interaction twice.
        if (isTouch && e.type === "click") return;

        const now = Date.now();
        const DOUBLE_CLICK_THRESHOLD = 400; // Milliseconds to define a double click/tap.
        const lastTime = this.lastClickTimes[iconId] || 0; // Get last click time for this icon, or 0 if none.

        if (now - lastTime < DOUBLE_CLICK_THRESHOLD) {
          // Double-click/tap detected: Open the program or social link.
          if (!icon.classList.contains("selected")) this.selectIcon(icon, true); // Select if not already selected.
          let programName = icon.getAttribute("data-program-name"); // Get program identifier from data attribute.

          if (socialsByKey[programName]) {
            // If it's a social icon (found in our lookup), open its URL in a new tab.
            window.open(socialsByKey[programName].url, "_blank");
          } else {
            // Otherwise, it's a regular program; publish an event to open it via the event bus.
            this.eventBus.publish(EVENTS.PROGRAM_OPEN, { programName });
          }
          this.lastClickTimes[iconId] = 0; // Reset last click time to require two new clicks for next double-click.
        } else {
          // Single click/tap: Select the icon. Ctrl key modifies selection behavior (toggle vs. new selection).
          this.toggleIconSelection(icon, e.ctrlKey);
          this.lastClickTimes[iconId] = now; // Record time of this click for double-click detection.
        }
      };

      // Attach the appropriate event listener based on device type.
      if (isTouch) {
        icon.addEventListener("touchend", handleIconActivate);
      } else {
        icon.addEventListener("click", handleIconActivate);
      }
    });
  }

  // --- Desktop Interaction and Selection Logic ---
  /**
   * Sets up a click event listener on the desktop background (or its selection overlay).
   * @description When the desktop background itself (not an icon) is clicked, and no drag operation
   * is in progress or has just completed (indicated by `this.hasDragged`), this action clears any currently selected icons.
   * This ensures that a simple click on the empty desktop area deselects icons.
   * @returns {void} Nothing.
   */
  setupDesktopEvents() {
    this.desktop.addEventListener("click", (e) => {
      // Check if the click target is the desktop or its overlay.
      if (e.target === this.desktop || e.target === this.overlay) {
        // Only clear selection if not currently dragging and no drag just occurred (hasDragged flag is false).
        // This prevents clearing selection when a drag-select operation finishes on the desktop background.
        if (!this.isDragging && !this.hasDragged) {
          this.clearSelection();
        }
      }
    });
  }

  /**
   * Initializes pointer event listeners (`pointerdown`, `pointermove`, `pointerup`) on the window
   * to enable drag-to-select functionality on the desktop.
   * @description Manages the creation and rendering of a visual selection box, identifies icons
   * that intersect with this box, and updates their selection state upon pointer release.
   * Includes logic to handle `activeDragPointerId` for mobile to avoid issues with multi-touch
   * or inconsistent pointer events, ensuring only one drag operation is active.
   * @returns {void} Nothing.
   */
  setupPointerSelectionEvents() {
    // Listen for pointer down on the window to initiate drag selection.
    // Using `window` allows drag to start anywhere, but we only act if it's on the desktop/overlay.
    window.addEventListener("pointerdown", (e) => {
      // Only initiate drag if the event target is the desktop overlay or the desktop itself.
      // This prevents dragging from interfering with other UI elements.
      if (e.target !== this.overlay && e.target !== this.desktop) return;

      // Special handling for mobile devices to prevent issues with multiple active pointers or stuck states.
      if (isMobileDevice()) {
        if (
          this.activeDragPointerId !== null && // If a drag is already associated with a pointer
          this.activeDragPointerId !== e.pointerId // And this new pointerdown is from a different pointer
        ) {
          this.resetDragSelectionState(); // Reset state, likely a multi-touch scenario not intended for selection.
        } else if (
          this.isDragging && // Or, if already dragging with the same pointer (should not happen often, but as a safeguard)
          this.activeDragPointerId === e.pointerId
        ) {
          this.resetDragSelectionState(); // Reset to be safe.
        }
      }

      if (this.isDragging) return; // If a drag is already in progress, ignore new pointerdown.

      // If Ctrl key is not pressed, clear any existing selection before starting a new one.
      // This is standard desktop behavior: a new drag without Ctrl starts a new selection.
      if (!e.ctrlKey) this.clearSelection();

      const rect = this.desktop.getBoundingClientRect();
      this.startX = e.clientX - rect.left; // Record start X relative to the desktop.
      this.startY = e.clientY - rect.top; // Record start Y relative to the desktop.

      this.clearTemporaryHighlights(); // Clear any `hover-by-selection` classes from previous drags.

      // Create the visual selection box element.
      this.selectionBox = document.createElement("div");
      this.selectionBox.className = "selection-box"; // Apply CSS for styling (e.g., border, background).
      Object.assign(this.selectionBox.style, {
        // Position it at the start point with zero size initially.
        left: `${this.startX}px`,
        top: `${this.startY}px`,
        width: "0px",
        height: "0px",
      });
      this.desktop.appendChild(this.selectionBox);

      this.isDragging = true; // Set dragging flag.
      this.hasDragged = false; // Reset hasDragged flag (pointer hasn't moved yet).
      this.activeDragPointerId = e.pointerId; // Store the ID of the pointer initiating the drag.
    });

    // Listen for pointer move on the window to update the selection box and highlight icons.
    window.addEventListener("pointermove", (e) => {
      if (!this.isDragging || !this.selectionBox) return; // Only act if dragging and selection box exists.
      // On mobile, ensure the move event is from the same pointer that started the drag, preventing multi-touch interference.
      if (isMobileDevice() && e.pointerId !== this.activeDragPointerId) return;

      this.hasDragged = true; // Mark that the pointer has moved, differentiating from a simple click.
      const rect = this.desktop.getBoundingClientRect();
      const currentX = e.clientX - rect.left; // Current X relative to the desktop.
      const currentY = e.clientY - rect.top; // Current Y relative to the desktop.

      // Calculate dimensions and position of the selection box.
      // Handles dragging in all four directions (top-left, top-right, bottom-left, bottom-right).
      const x = Math.min(currentX, this.startX);
      const y = Math.min(currentY, this.startY);
      const w = Math.abs(currentX - this.startX);
      const h = Math.abs(currentY - this.startY);

      // Update the selection box style.
      Object.assign(this.selectionBox.style, {
        left: `${x}px`,
        top: `${y}px`,
        width: `${w}px`,
        height: `${h}px`,
      });
      // Highlight icons that intersect with the updated selection box.
      this.highlightIconsIntersecting(x, y, w, h);
    });

    // Listen for pointer up on the window to finalize the drag selection.
    window.addEventListener("pointerup", (e) => {
      if (!this.isDragging || !this.selectionBox) return; // Only act if dragging and selection box exists.
      // On mobile, ensure the up event is from the same pointer that started the drag.
      if (isMobileDevice() && e.pointerId !== this.activeDragPointerId) return;

      this.isDragging = false; // Clear dragging flag, the operation is now complete.
      // Iterate over all icons.
      this.getIcons().forEach((icon) => {
        // If an icon was temporarily highlighted by the drag (`hover-by-selection` class)...
        if (icon.classList.contains("hover-by-selection")) {
          icon.classList.remove("hover-by-selection"); // Remove temporary highlight.
          icon.classList.add("selected"); // Add to permanent selection by applying the "selected" class.
          this.selectedIcons.add(icon); // Also add to the internal set of selected icons.
        }
      });

      // Remove the visual selection box from the DOM.
      if (this.selectionBox?.parentNode) {
        // Check if selectionBox exists and is in the DOM.
        this.selectionBox.parentNode.removeChild(this.selectionBox);
        this.selectionBox = null; // Nullify the reference.
      }
      this.activeDragPointerId = null; // Reset active pointer ID, ready for a new drag.
    });
  }

  /**
   * Adds a temporary highlight class (`hover-by-selection`) to desktop icons that
   * geometrically intersect with the given selection rectangle coordinates.
   * The coordinates are relative to the desktop container.
   * @param {number} left - The left X coordinate of the selection box, relative to the desktop container.
   * @param {number} top - The top Y coordinate of the selection box, relative to the desktop container.
   * @param {number} width - The width of the selection box.
   * @param {number} height - The height of the selection box.
   * @returns {void} Nothing.
   */
  highlightIconsIntersecting(left, top, width, height) {
    // Define the selection rectangle based on input parameters.
    const selectionRect = {
      left,
      top,
      right: left + width,
      bottom: top + height,
    };
    this.getIcons().forEach((icon) => {
      const rect = icon.getBoundingClientRect(); // Get icon's absolute position and size.
      const desktopRect = this.desktop.getBoundingClientRect(); // Get desktop's absolute position.

      // Convert icon's rectangle to be relative to the desktop container for accurate comparison
      // with the selectionRect, which is already relative to the desktop.
      const iconRect = {
        left: rect.left - desktopRect.left,
        top: rect.top - desktopRect.top,
        right: rect.right - desktopRect.left,
        bottom: rect.bottom - desktopRect.top,
      };

      // Basic Axis-Aligned Bounding Box (AABB) intersection test.
      const intersects = !(
        iconRect.right < selectionRect.left ||
        iconRect.left > selectionRect.right ||
        iconRect.bottom < selectionRect.top ||
        iconRect.top > selectionRect.bottom
      );

      // Add or remove temporary highlight class based on intersection.
      if (intersects) {
        icon.classList.add("hover-by-selection");
      } else {
        icon.classList.remove("hover-by-selection");
      }
    });
  }

  /**
   * Toggles the selection state of a given desktop icon.
   * @description If the Ctrl key (or Cmd on Mac, handled by `e.ctrlKey`) was pressed during the event,
   * it adds the icon to the current selection if not already selected, or removes it if it was.
   * Otherwise (Ctrl not pressed), it clears any existing selection and selects only the given icon.
   * Updates `this.selectedIcons` set and the "selected" class on the icon element accordingly.
   * @param {HTMLElement} icon - The desktop icon DOM element to toggle.
   * @param {boolean} isCtrlPressed - True if the Ctrl/Cmd key was pressed during the interaction, indicating multi-select.
   * @returns {void} Nothing.
   */
  toggleIconSelection(icon, isCtrlPressed) {
    if (isCtrlPressed) {
      // Ctrl key is pressed: Add to or remove from current selection.
      if (icon.classList.contains("selected")) {
        icon.classList.remove("selected");
        this.selectedIcons.delete(icon);
      } else {
        icon.classList.add("selected");
        this.selectedIcons.add(icon);
      }
    } else {
      // Ctrl key not pressed: Clear existing selection and select only this icon.
      this.clearSelection();
      icon.classList.add("selected");
      this.selectedIcons.add(icon);
    }
  }

  /**
   * Selects a given desktop icon and adds it to the selection state.
   * @description Adds the "selected" class to the icon element and adds the element to `this.selectedIcons` set.
   * Optionally clears all other selected icons first, which is the default behavior for a standard single selection.
   * @param {HTMLElement} icon - The desktop icon DOM element to select.
   * @param {boolean} [clearOthers=true] - If true (default), clears all other selected icons before selecting this one.
   *                                      If false, adds this icon to the existing selection (additive selection).
   * @returns {void} Nothing.
   */
  selectIcon(icon, clearOthers = true) {
    if (clearOthers) this.clearSelection();
    icon.classList.add("selected");
    this.selectedIcons.add(icon);
  }

  /**
   * Clears all currently selected desktop icons.
   * @description Removes the "selected" class and the temporary "hover-by-selection" class
   * from all desktop icon elements and clears the `this.selectedIcons` set.
   * This is used to deselect all icons, e.g., when clicking on the desktop background.
   * @returns {void} Nothing.
   */
  clearSelection() {
    this.getIcons().forEach((icon) => {
      icon.classList.remove("selected", "hover-by-selection");
    });
    this.selectedIcons.clear();
  }

  /**
   * Removes only the temporary "hover-by-selection" class from all desktop icons.
   * @description This is used during a drag selection operation to update visual feedback
   * as the selection box moves, without affecting the actual confirmed "selected" state of icons.
   * This ensures that icons only visually react to the drag before selection is finalized on pointerup.
   * @returns {void} Nothing.
   */
  clearTemporaryHighlights() {
    this.getIcons().forEach((icon) =>
      icon.classList.remove("hover-by-selection"),
    );
  }

  /**
   * Resets the state related to an ongoing or interrupted drag selection operation.
   * @description Clears the active drag pointer ID, removes the visual selection box from the DOM
   * if it exists, and resets the `isDragging` and `hasDragged` flags.
   * This is useful for cleaning up if a drag operation is prematurely ended or if an external event
   * (like a new window focusing or the start menu opening) occurs that should cancel the drag.
   * It also clears any temporary visual highlights on icons.
   * @returns {void} Nothing.
   */
  resetDragSelectionState() {
    this.isDragging = false;
    this.hasDragged = false;
    this.activeDragPointerId = null;
    // Remove the selection box element if it exists in the DOM.
    if (this.selectionBox && this.selectionBox.parentNode) {
      this.selectionBox.parentNode.removeChild(this.selectionBox);
      this.selectionBox = null; // Nullify reference to the removed element.
    }
    this.clearTemporaryHighlights(); // Also clear any temporary visual highlights on icons.
  }
}
