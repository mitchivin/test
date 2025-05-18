/**
 * startMenu.js — Start Menu Component for Windows XP Simulation
 *
 * Handles the start menu UI, including:
 * - Menu display, toggling, and submenu logic
 * - Dynamic menu building for programs, socials, and recently used
 * - Event-driven integration with the rest of the system
 *
 * Usage:
 *   import StartMenu from './startMenu.js';
 *   const startMenu = new StartMenu(eventBus);
 *
 * Edge Cases:
 *   - If #start-button is missing, menu cannot be toggled by user.
 *   - If .startmenu already exists, it is replaced.
 *   - Submenus are dynamically created and destroyed as needed.
 *
 * @module startMenu
 */
import { EVENTS } from "../utils/eventBus.js";
import { isMobileDevice } from "../utils/device.js";

const ALL_PROGRAMS_ITEMS = [
  // Socials first
  {
    type: "url",
    url: "https://www.instagram.com/mitchivin",
    icon: "./assets/gui/start-menu/instagram.webp",
    label: "Instagram",
  },
  {
    type: "url",
    url: "https://github.com/mitchivin",
    icon: "./assets/gui/start-menu/github.webp",
    label: "GitHub",
  },
  {
    type: "url",
    url: "https://www.linkedin.com/in/mitchivin",
    icon: "./assets/gui/start-menu/linkedin.webp",
    label: "LinkedIn",
  },
  {
    type: "url",
    url: "https://www.behance.net/mitch_ivin",
    icon: "./assets/gui/start-menu/behance.webp",
    label: "Behance",
  },
  { type: "separator" }, // Separator after socials
  // Then the rest of the programs
  {
    type: "program",
    programName: "about",
    icon: "./assets/gui/desktop/about.webp",
    label: "About Me",
  },
  {
    type: "program",
    programName: "internet",
    icon: "./assets/gui/desktop/internet.webp",
    label: "My Projects",
  },
  {
    type: "program",
    programName: "resume",
    icon: "./assets/gui/desktop/resume.webp",
    label: "My Resume",
  },
  {
    type: "program",
    programName: "contact",
    icon: "./assets/gui/desktop/contact.webp",
    label: "Contact Me",
  },
  {
    type: "program",
    programName: "my-pictures",
    icon: "./assets/gui/start-menu/photos.webp",
    label: "My Photos",
    disabled: true, // Always disabled
  },
  {
    type: "program",
    programName: "mediaPlayer",
    icon: "./assets/gui/start-menu/mediaPlayer.webp",
    label: "Media Player",
    disabled: true, // Always disabled
  },
  {
    type: "program",
    programName: "musicPlayer",
    icon: "./assets/gui/start-menu/music.webp",
    label: "Music Player",
    disabled: true, // Always disabled
  },
  {
    type: "program",
    programName: "notepad",
    icon: "./assets/gui/start-menu/notepad.webp",
    label: "Notepad",
    disabled: true, // Always disabled
  },
  {
    type: "program",
    programName: "cmd",
    icon: "./assets/gui/start-menu/cmd.webp",
    label: "Command Prompt",
    disabled: true, // Always disabled
  }
];

// Add menu item arrays for abstraction
const RECENTLY_USED_ITEMS = [
  {
    type: "program",
    programName: "program1",
    icon: "./assets/gui/start-menu/vanity-apps/photoshop.webp",
    label: "Adobe Photoshop",
    disabled: true,
  },
  {
    type: "program",
    programName: "program2",
    icon: "./assets/gui/start-menu/vanity-apps/premiere.webp",
    label: "Adobe Premiere Pro",
    disabled: true,
  },
  {
    type: "program",
    programName: "program3",
    icon: "./assets/gui/start-menu/vanity-apps/illustrator.webp",
    label: "Adobe Illustrator",
    disabled: true,
  },
  {
    type: "program",
    programName: "after-effects",
    icon: "./assets/gui/start-menu/vanity-apps/after-effects.webp",
    label: "Adobe After Effects",
    disabled: true,
  },
  {
    type: "program",
    programName: "indesign",
    icon: "./assets/gui/start-menu/vanity-apps/indesign.webp",
    label: "Adobe InDesign",
    disabled: true,
  },
  {
    type: "program",
    programName: "program6",
    icon: "./assets/gui/start-menu/vanity-apps/blender.webp",
    label: "Blender",
    disabled: true,
  },
  {
    type: "program",
    programName: "vscode",
    icon: "./assets/gui/start-menu/vanity-apps/vscode.webp",
    label: "VS Code",
    disabled: true,
  },
  {
    type: "program",
    programName: "chatgpt",
    icon: "./assets/gui/start-menu/vanity-apps/chatgpt.webp",
    label: "ChatGPT",
    disabled: true,
  },
  {
    type: "program",
    programName: "cursor",
    icon: "./assets/gui/start-menu/vanity-apps/cursor.webp",
    label: "Cursor",
    disabled: true,
  },
];

// Helper to build menu HTML from item array
function buildMenuHTML(items, itemClass, ulClass) {
  return (
    `<ul${ulClass ? ` class="${ulClass}"` : ""}>` +
    items
      .map((item) => {
        if (item.type === "separator") {
          return `<li class="${itemClass}-separator"></li>`;
        } else if (item.type === "program") {
          return (
            `<li class="${itemClass}-item${item.disabled ? " disabled" : ""}" data-program-name="${item.programName}">
` +
            `<img src="${item.icon}" alt="${item.label}">
` +
            `${item.label}
` +
            `</li>`
          );
        } else if (item.type === "url") {
          return (
            `<li class="${itemClass}-item" data-action="open-url" data-url="${item.url}">
` +
            `<img src="${item.icon}" alt="${item.label}">
` +
            `${item.label}
` +
            `</li>`
          );
        }
        return "";
      })
      .join("") +
    "</ul>"
  );
}

// Helper to attach menu item effects (mousedown, mouseup, etc.)
function attachMenuItemEffects(menuElement, itemSelector) {
  const items = menuElement.querySelectorAll(itemSelector);
  items.forEach((item) => {
    item.addEventListener("mousedown", (e) => {
      e.preventDefault();
      item.classList.add("menu-item-clicked");
    });
    ["mouseup", "mouseleave", "mouseout"].forEach((eventType) => {
      item.addEventListener(eventType, () => {
        item.classList.remove("menu-item-clicked");
      });
    });
  });
}

// ==================================================
//  Start Menu Module for Windows XP Simulation
// ==================================================
/**
 * StartMenu manages the Windows XP start menu UI, submenus, and event-driven logic.
 *
 * @class
 * @example
 * import StartMenu from './startMenu.js';
 * const startMenu = new StartMenu(eventBus);
 */
export default class StartMenu {
  /**
   * Create a new StartMenu instance.
   * @param {EventBus} eventBus - The event bus instance for communication.
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.startButton = document.getElementById("start-button");
    this.startMenu = null;
    this.allProgramsMenu = null;
    this.recentlyUsedMenu = null;
    this.activeWindowOverlay = null; // Keep track of which overlay is active

    this.createStartMenuElement();
    this.setupEventListeners();

    // Subscribe to event bus for start menu toggle and close requests
    this.eventBus.subscribe(EVENTS.STARTMENU_TOGGLE, () =>
      this.toggleStartMenu(),
    );
    this.eventBus.subscribe(EVENTS.STARTMENU_CLOSE_REQUEST, () => {
      if (this.startMenu?.classList.contains("active")) {
        this.closeStartMenu();
      }
    });
    // Listen for window focus changes
    this.eventBus.subscribe(EVENTS.WINDOW_FOCUSED, (data) => {
      this.updateContentOverlay(data?.windowId);
    });
  }

  /**
   * Create and insert the main start menu DOM element.
   * Replaces any existing .startmenu element.
   * @returns {void}
   */
  createStartMenuElement() {
    const existingMenu = document.querySelector(".startmenu");
    if (existingMenu) {
      existingMenu.parentNode.removeChild(existingMenu);
    }

    const startMenu = document.createElement("div");
    startMenu.className = "startmenu";
    startMenu.innerHTML = this.getMenuTemplate();
    startMenu.style.visibility = "hidden";
    startMenu.style.opacity = "0";

    document.body.appendChild(startMenu);
    this.startMenu = startMenu;

    this.createAllProgramsMenu();
    this.createRecentlyUsedMenu();
    this.setupMenuItems();
    this._setupDelegatedEventHandlers();
  }

  /**
   * Helper function to create a submenu element.
   * @param {string} className - The CSS class for the submenu container.
   * @param {string} menuHTML - The HTML content for the submenu.
   * @param {string} propertyName - The name of the class property to assign the element to.
   * @returns {HTMLElement} The created submenu element.
   */
  _createSubMenu(className, menuHTML, propertyName) {
    if (!this[propertyName]) {
      const menuElement = document.createElement("div");
      menuElement.className = className;
      menuElement.innerHTML = menuHTML;
      menuElement.style.display = "none";
      document.body.appendChild(menuElement);
      this[propertyName] = menuElement;
    }
    return this[propertyName];
  }

  /**
   * Generalized helper to create a submenu and attach effects/handlers.
   * @param {Object} options - Options for submenu creation
   * @param {Array} options.items - Array of menu items
   * @param {string} options.itemClass - Base class for menu items
   * @param {string} options.ulClass - Class for the <ul> element
   * @param {string} options.menuClass - Class for the submenu container
   * @param {string} options.propertyName - Property name to assign the menu element to
   * @param {string} options.itemSelector - Selector for menu items
   * @param {boolean} [options.attachClickHandler] - Whether to attach the click handler
   */
  _createMenuWithEffects({
    items,
    itemClass,
    ulClass,
    menuClass,
    propertyName,
    itemSelector,
    attachClickHandler,
  }) {
    const menuHTML = buildMenuHTML(items, itemClass, ulClass);
    const menuElement = this._createSubMenu(menuClass, menuHTML, propertyName);
    attachMenuItemEffects(menuElement, itemSelector);
    if (attachClickHandler) {
      menuElement.addEventListener("click", this._handleMenuClick.bind(this));
    }
    return menuElement;
  }

  /**
   * Create the All Programs submenu and attach to DOM.
   * @returns {void}
   */
  createAllProgramsMenu() {
    this._createMenuWithEffects({
      items: ALL_PROGRAMS_ITEMS,
      itemClass: "all-programs",
      ulClass: "all-programs-items",
      menuClass: "all-programs-menu",
      propertyName: "allProgramsMenu",
      itemSelector: ".all-programs-item",
      attachClickHandler: false,
    });
  }

  /**
   * Create the Recently Used submenu and attach to DOM.
   * @returns {void}
   */
  createRecentlyUsedMenu() {
    this._createMenuWithEffects({
      items: RECENTLY_USED_ITEMS,
      itemClass: "recently-used",
      ulClass: "recently-used-items",
      menuClass: "recently-used-menu",
      propertyName: "recentlyUsedMenu",
      itemSelector: ".recently-used-item",
      attachClickHandler: true,
    });
  }

  /**
   * Get the HTML template string for the main start menu.
   * @returns {string} HTML string for the start menu.
   */
  getMenuTemplate() {
    // Helper to render a menu item with optional disabling
    function renderMenuItem({
      id,
      icon,
      title,
      description,
      programName,
      action,
      url,
    }) {
      const programsToDisable = ["mediaPlayer", "my-pictures", "notepad", "cmd", "musicPlayer"];
      const shouldDisable = programsToDisable.includes(programName);

      const disabledClass = shouldDisable ? " disabled" : "";
      const dataAction = shouldDisable
        ? ""
        : action
          ? `data-action="${action}"`
          : "";
      const dataProgram = shouldDisable
        ? ""
        : programName
          ? `data-program-name="${programName}"`
          : "";
      const dataUrl = url ? `data-url="${url}"` : "";
      return `<li class="menu-item${disabledClass}" id="menu-${programName || id}" ${dataAction} ${dataProgram} ${dataUrl} tabindex="${shouldDisable ? "-1" : "0"}" aria-disabled="${shouldDisable ? "true" : "false"}">
        <img src="${icon}" alt="${title}">
        <div class="item-content">
          <span class="item-title">${title}</span>
          ${description ? `<span class="item-description">${description}</span>` : ""}
        </div>
      </li>`;
    }
    return `
      <div class="menutopbar">
        <img src="./assets/gui/boot/userlogin.webp" alt="User" class="userpicture">
        <span class="username">Mitch Ivin</span>
      </div>
      <div class="start-menu-middle">
        <div class="middle-section middle-left">
          <ul class="menu-items">
            ${renderMenuItem({
              id: "internet",
              icon: "./assets/gui/desktop/internet.webp",
              title: "My Projects",
              description: "View my work",
              programName: "internet",
              action: "open-program",
            })}
            ${renderMenuItem({
              id: "contact",
              icon: "./assets/gui/desktop/contact.webp",
              title: "Contact Me",
              description: "Send me a message",
              programName: "contact",
              action: "open-program",
            })}
            <li class="menu-divider"><hr class="divider"></li>
            ${renderMenuItem({
              id: "about",
              icon: "./assets/gui/desktop/about.webp",
              title: "About Me",
              programName: "about",
              action: "open-program",
            })}
            ${renderMenuItem({
              id: "resume",
              icon: "./assets/gui/desktop/resume.webp",
              title: "My Resume",
              programName: "resume",
              action: "open-program",
            })}
            ${renderMenuItem({
              id: "mediaPlayer",
              icon: "./assets/gui/start-menu/mediaPlayer.webp",
              title: "Media Player",
              programName: "mediaPlayer",
              action: "open-program",
            })}
            ${renderMenuItem({
              id: "my-pictures",
              icon: "./assets/gui/start-menu/photos.webp",
              title: "My Photos",
              programName: "my-pictures",
              action: "open-program",
            })}
            ${renderMenuItem({
              id: "musicPlayer",
              icon: "./assets/gui/start-menu/music.webp",
              title: "Music Player",
              programName: "musicPlayer",
              action: "open-program",
            })}
            <li class="menu-divider"><hr class="divider"></li>
          </ul>
          <div class="all-programs-container">
            <div class="all-programs-button" id="menu-all-programs" data-action="toggle-all-programs">
              <span>All Programs</span>
              <img src="./assets/gui/start-menu/arrow.webp" alt="All Programs">
            </div>
          </div>
        </div>
        <div class="middle-section middle-right">
          <ul class="menu-items">
            ${renderMenuItem({
              id: "behance",
              icon: "./assets/gui/start-menu/behance.webp",
              title: "Behance",
              url: "https://www.behance.net/mitch_ivin",
              action: "open-url",
            })}
            ${renderMenuItem({
              id: "linkedin",
              icon: "./assets/gui/start-menu/linkedin.webp",
              title: "LinkedIn",
              url: "https://www.linkedin.com/in/mitchivin",
              action: "open-url",
            })}
            ${renderMenuItem({
              id: "github",
              icon: "./assets/gui/start-menu/github.webp",
              title: "GitHub",
              url: "https://github.com/mitchivin",
              action: "open-url",
            })}
            ${renderMenuItem({
              id: "instagram",
              icon: "./assets/gui/start-menu/instagram.webp",
              title: "Instagram",
              url: "https://www.instagram.com/mitchivin",
              action: "open-url",
            })}
            <li class="menu-divider divider-darkblue"><hr class="divider"></li>
            ${renderMenuItem({
              id: "notepad",
              icon: "./assets/gui/start-menu/notepad.webp",
              title: "Notepad",
              programName: "notepad",
              action: "open-program",
            })}
            ${renderMenuItem({
              id: "cmd",
              icon: "./assets/gui/start-menu/cmd.webp",
              title: "Command Prompt",
              programName: "cmd",
              action: "open-program",
            })}
            <li class="menu-divider divider-darkblue"><hr class="divider"></li>
            <li class="menu-item" id="menu-program4" data-action="toggle-recently-used">
              <img src="./assets/gui/start-menu/recently-used.webp" alt="Recently Used">
              <div class="item-content">
                <span class="item-title">Recently Used</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
      <div class="start-menu-footer">
        <div class="footer-buttons">
          <div class="footer-button" id="btn-log-off" data-action="log-off">
            <img src="./assets/gui/start-menu/logoff.webp" alt="Log Off">
            <span>Log Off</span>
          </div>
          <div class="footer-button" id="btn-shut-down" data-action="shut-down">
            <img src="./assets/gui/start-menu/shutdown.webp" alt="Shut Down">
            <span>Shut Down</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Set up all necessary event listeners for menu open/close, overlay, and key handling.
   * Handles outside clicks, overlay logic, and Escape key to close menu.
   * @returns {void}
   */
  setupEventListeners() {
    window.addEventListener(
      "mousedown",
      (e) => {
        // Only act if the menu is actually active
        if (!this.startMenu?.classList.contains("active")) {
          return;
        }
        const target = e.target;

        // IMPORTANT: If the target is the overlay we added,
        // let its own listener handle it (via eventBus).
        // Also ignore clicks on iframes directly (should be covered by overlay).
        if (
          target.classList.contains("start-menu-content-click-overlay") ||
          target.tagName === "IFRAME"
        ) {
          return;
        }

        const clickedOnMenu = this.startMenu.contains(target);
        const clickedOnButton = this.startButton.contains(target);
        const clickedOnAllPrograms = this.allProgramsMenu?.contains(target);

        // Check if click was in the Recently Used Tools menu
        const clickedOnRecentlyUsed = this.recentlyUsedMenu?.contains(target);

        // If the click was NOT on menu/button/submenu AND not the overlay/iframe, close.
        if (
          !clickedOnMenu &&
          !clickedOnButton &&
          !clickedOnAllPrograms &&
          !clickedOnRecentlyUsed
        ) {
          e.stopPropagation();
          e.preventDefault();
          // Explicitly hide All Programs submenu first
          this.hideAllProgramsMenu();
          // Then close the main menu
          this.closeStartMenu();
        }
      },
      true,
    ); // Use capture phase

    // Keep ONLY Escape key listener
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.startMenu?.classList.contains("active")) {
        this.closeStartMenu();
      }
    });
  }

  /**
   * Handle clicks on menu items using event delegation.
   * Ignores clicks on disabled items in submenus.
   * @param {MouseEvent} event - The click event object.
   * @returns {void}
   */
  _handleMenuClick(event) {
    const target = event.target.closest(
      "[data-action], [data-program-name], [data-url]",
    );
    if (!target) return;

    // Prevent any action for disabled all-programs-item on mobile
    if (
      target.classList.contains("all-programs-item") &&
      target.classList.contains("disabled")
    ) {
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    // Prevent closing the menu if a disabled item in Recently Used Tools is clicked
    if (
      target.classList.contains("recently-used-item") &&
      target.classList.contains("disabled")
    ) {
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    const action = target.dataset.action;
    const programName = target.dataset.programName;
    const url = target.dataset.url;

    // Handle Recently Used Tools popout on both desktop and mobile
    if (action === "toggle-recently-used") {
      this.showRecentlyUsedMenu();
      return;
    }

    if (action === "open-program" && programName) {
      this.openProgram(programName);
      this.closeStartMenu();
    } else if (action === "open-url" && url) {
      window.open(url, "_blank");
      this.closeStartMenu();
    } else if (action === "log-off") {
      sessionStorage.removeItem("logged_in");
      this.eventBus.publish(EVENTS.LOG_OFF_REQUESTED);
      this.closeStartMenu();
    } else if (action === "shut-down") {
      sessionStorage.removeItem("logged_in");
      window.location.reload();
    }

    // Handle All Programs menu items: open or restore program window for non-social links
    if (
      target.classList.contains("all-programs-item") &&
      target.hasAttribute("data-program-name")
    ) {
      const programName = target.getAttribute("data-program-name");
      if (programName) {
        this.openProgram(programName); // Will open or restore the window
        this.closeStartMenu();
        return;
      }
    }
  }

  /**
   * Sets up delegated event listeners for the start menu.
   */
  _setupDelegatedEventHandlers() {
    [
      this.startMenu,
      this.allProgramsMenu,
      this.recentlyUsedMenu,
    ].forEach((menu) => {
      if (menu) {
        menu.addEventListener("click", this._handleMenuClick.bind(this));
      }
    });
  }

  /**
   * Set up menu items and their click handlers
   */
  setupMenuItems() {
    this.setupAllProgramsMenu(); // Setup submenu immediately

    // Setup Recently Used Tools submenu
    const recentlyUsedButton = this.startMenu.querySelector("#menu-program4");
    if (recentlyUsedButton) {
      recentlyUsedButton.setAttribute("data-action", "toggle-recently-used"); // Ensure action is set
      recentlyUsedButton.style.position = "relative";
      recentlyUsedButton.style.width = "100%";
      const mutArrowSpan = document.createElement("span");
      mutArrowSpan.className = "mut-menu-arrow";
      mutArrowSpan.innerHTML = "►";
      mutArrowSpan.style.position = "absolute";
      mutArrowSpan.style.right = "8px";
      mutArrowSpan.style.top = "50%";
      mutArrowSpan.style.transform = "translateY(-50%) scaleX(0.5)";
      mutArrowSpan.style.fontSize = "10px";
      recentlyUsedButton.appendChild(mutArrowSpan);
      recentlyUsedButton.addEventListener("mouseenter", () =>
        this.showRecentlyUsedMenu(),
      );
      recentlyUsedButton.addEventListener("mouseleave", (e) => {
        if (
          e.relatedTarget &&
          (e.relatedTarget.closest(".recently-used-menu") ||
            e.relatedTarget === this.recentlyUsedMenu)
        )
          return;
        this.hideRecentlyUsedMenu();
      });
    }
  }

  /**
   * Set up All Programs menu behavior
   */
  setupAllProgramsMenu() {
    const allProgramsButton = document.getElementById("menu-all-programs");

    if (!allProgramsButton || !this.allProgramsMenu || !this.startMenu) {
      return;
    }

    allProgramsButton.addEventListener("mouseenter", () =>
      this.showAllProgramsMenu(),
    );

    allProgramsButton.addEventListener("mouseleave", (e) => {
      if (
        e.relatedTarget &&
        (e.relatedTarget.closest(".all-programs-menu") ||
          e.relatedTarget === this.allProgramsMenu)
      ) {
        return; // Don't hide if moving into the submenu itself
      }
      this.hideAllProgramsMenu();
    });

    this.allProgramsMenu.addEventListener("mouseleave", (e) => {
      if (
        e.relatedTarget &&
        (e.relatedTarget === allProgramsButton ||
          e.relatedTarget.closest("#menu-all-programs"))
      ) {
        return; // Don't hide if moving back to the trigger button
      }
      this.hideAllProgramsMenu();
    });

    const otherElements = this.startMenu.querySelectorAll(
      ".menu-item:not(#menu-all-programs), .menutopbar, .start-menu-footer, .middle-right",
    );

    otherElements.forEach((element) => {
      element.addEventListener("mouseenter", () => this.hideAllProgramsMenu());
    });
  }

  /**
   * Show the All Programs menu
   */
  showAllProgramsMenu() {
    if (!this.allProgramsMenu || !this.startMenu) {
      return;
    }

    const allProgramsButton =
      this.startMenu.querySelector("#menu-all-programs");
    const footerElement = this.startMenu.querySelector(".start-menu-footer");

    if (!allProgramsButton || !footerElement) {
      return;
    }

    const buttonRect = allProgramsButton.getBoundingClientRect();
    const footerRect = footerElement.getBoundingClientRect();

    const calculatedLeft = buttonRect.right + "px";
    const calculatedBottom = window.innerHeight - footerRect.top + "px";

    Object.assign(this.allProgramsMenu.style, {
      left: calculatedLeft,
      bottom: calculatedBottom,
      top: "auto",
      display: "block",
    });

    this.allProgramsMenu.classList.add("active");
  }

  /**
   * Hide the All Programs menu
   */
  hideAllProgramsMenu() {
    if (this.allProgramsMenu) {
      this.allProgramsMenu.classList.remove("active");
      this.allProgramsMenu.style.display = "none";
    }
  }

  /**
   * Open a program using the event bus
   */
  openProgram(programName) {
    this.eventBus.publish(EVENTS.PROGRAM_OPEN, { programName });
  }

  /**
   * Toggle the start menu visibility
   */
  toggleStartMenu() {
    if (!this.startMenu) {
      return;
    }

    const isCurrentlyActive = this.startMenu.classList.contains("active");

    if (!isCurrentlyActive) {
      this.startMenu.style.visibility = "visible";
      this.startMenu.style.opacity = "1";
      this.startMenu.classList.add("active");
      this.eventBus.publish(EVENTS.STARTMENU_OPENED);

      // Activate overlay on the window that is active *at this moment*
      const currentActiveWindow = document.querySelector(".window.active");
      this.updateContentOverlay(currentActiveWindow?.id);
      // Attach iframe focus listeners
      this.attachIframeFocusListeners();
      // Attach window blur listener
      this.attachWindowBlurListener();
    } else {
      this.closeStartMenu(); // This will hide the overlay
    }
  }

  /**
   * Close the start menu
   */
  closeStartMenu() {
    const isActive = this.startMenu?.classList.contains("active");

    if (!this.startMenu || !isActive) {
      return;
    }

    this.startMenu.classList.remove("active");

    this.hideAllProgramsMenu();

    // Deactivate overlay state immediately after removing .active class
    this.updateContentOverlay(null);

    // Remove iframe focus listeners
    this.removeIframeFocusListeners();
    // Remove window blur listener
    this.removeWindowBlurListener();

    // Apply style changes in the next frame
    requestAnimationFrame(() => {
      this.startMenu.style.visibility = "hidden";
      this.startMenu.style.opacity = "0";
    });

    this.eventBus.publish(EVENTS.STARTMENU_CLOSED);

    // Also hide submenus
    this.hideRecentlyUsedMenu();
  }

  // New helper method to manage overlay activation
  updateContentOverlay(activeWindowId) {
    // Deactivate previously active overlay (if any)
    if (this.activeWindowOverlay) {
      this.activeWindowOverlay.style.display = "none";
      this.activeWindowOverlay.style.pointerEvents = "none";
      this.activeWindowOverlay = null;
    }

    // Find the potential new overlay target
    let targetOverlay = null;
    if (activeWindowId) {
      const activeWindow = document.getElementById(activeWindowId);
      if (activeWindow) {
        targetOverlay = activeWindow.querySelector(
          ".start-menu-content-click-overlay",
        );
      }
    }

    // ONLY Activate the target overlay IF the menu is currently active
    if (targetOverlay && this.startMenu?.classList.contains("active")) {
      targetOverlay.style.display = "block";
      targetOverlay.style.pointerEvents = "auto";
      this.activeWindowOverlay = targetOverlay; // Track the currently active overlay
    } else if (targetOverlay) {
      targetOverlay.style.display = "none";
      targetOverlay.style.pointerEvents = "none";
    }
  }

  /**
   * Show the Recently Used Tools menu
   */
  showRecentlyUsedMenu() {
    if (!this.recentlyUsedMenu || !this.startMenu) {
      return;
    }

    const button = this.startMenu.querySelector("#menu-program4");
    if (!button) {
      return;
    }

    // Ensure menu is visible to get dimensions, but positioned off-screen initially
    this.recentlyUsedMenu.style.visibility = "hidden";
    this.recentlyUsedMenu.style.display = "block";

    const buttonRect = button.getBoundingClientRect();
    const menuRect = this.recentlyUsedMenu.getBoundingClientRect();

    // Try positioning to the right first
    let left = buttonRect.right;

    // If it goes off-screen to the right, position to the left
    if (left + menuRect.width > window.innerWidth) {
      left = buttonRect.left - menuRect.width;
    }

    // Calculate top position to align bottom of menu with bottom of button
    let top = buttonRect.bottom - menuRect.height;

    // Ensure it doesn't go off-screen vertically (upwards)
    if (top < 0) {
      top = 0; // Align to top of viewport if not enough space
    }
    // Ensure it doesn't go below the taskbar (less likely with bottom alignment but safe)
    if (top + menuRect.height > window.innerHeight - 30) {
      top = window.innerHeight - 30 - menuRect.height;
    }

    Object.assign(this.recentlyUsedMenu.style, {
      left: `${left}px`,
      top: `${top}px`,
      display: "block", // Keep display block
      visibility: "visible", // Make visible now
    });

    // Add mouseleave event to the menu itself
    this.recentlyUsedMenu.addEventListener("mouseleave", (e) => {
      if (
        e.relatedTarget &&
        (e.relatedTarget === button ||
          e.relatedTarget.closest("#menu-program4"))
      )
        return;
      this.hideRecentlyUsedMenu();
    });

    this.recentlyUsedMenu.classList.add("mut-menu-active");
    button.classList.add("active-submenu-trigger");
  }

  /**
   * Hide the Recently Used Tools menu
   */
  hideRecentlyUsedMenu() {
    if (this.recentlyUsedMenu) {
      this.recentlyUsedMenu.classList.remove("mut-menu-active");
      this.recentlyUsedMenu.style.display = "none";
    }
    const button = this.startMenu?.querySelector("#menu-program4");
    button?.classList.remove("active-submenu-trigger");
  }

  /**
   * Attach focus listeners to all iframes to close the Start Menu when focused.
   */
  attachIframeFocusListeners() {
    // Store the handler so it can be removed later
    this._iframeFocusHandler = () => this.closeStartMenu();
    // Attach to all iframes currently in the DOM
    document.querySelectorAll('iframe').forEach(iframe => {
      iframe.addEventListener('focus', this._iframeFocusHandler);
    });
  }

  /**
   * Remove focus listeners from all iframes.
   */
  removeIframeFocusListeners() {
    if (!this._iframeFocusHandler) return;
    document.querySelectorAll('iframe').forEach(iframe => {
      iframe.removeEventListener('focus', this._iframeFocusHandler);
    });
    this._iframeFocusHandler = null;
  }

  /**
   * Attach blur listener to window to close the Start Menu when window loses focus (e.g., clicking into an iframe).
   */
  attachWindowBlurListener() {
    this._windowBlurHandler = () => this.closeStartMenu();
    window.addEventListener('blur', this._windowBlurHandler);
  }

  /**
   * Remove blur listener from window.
   */
  removeWindowBlurListener() {
    if (this._windowBlurHandler) {
      window.removeEventListener('blur', this._windowBlurHandler);
      this._windowBlurHandler = null;
    }
  }
}

// ==================================================
// END Start Menu Module
// ==================================================
