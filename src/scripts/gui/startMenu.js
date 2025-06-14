/**
 * @fileoverview Manages the Windows XP style Start Menu component.
 * @description This module defines the `StartMenu` class, responsible for creating, displaying,
 * and managing all interactions within the Start Menu. This includes rendering the main menu,
 * the "All Programs" flyout menu, handling recently used items (currently vanity items),
 * integrating social media links, and responding to system events like window focus changes
 * to correctly close the menu. It dynamically builds menu structures from predefined lists
 * and fetched data.
 *
 * Key Functionalities:
 * - Toggling Start Menu visibility.
 * - Dynamic generation of main menu, "All Programs" menu, and "Recently Used" (vanity) items.
 * - Handling submenu interactions (e.g., "All Programs").
 * - Launching programs and opening URLs from menu items.
 * - Closing the menu on various events (clicks outside, window focus, Escape key).
 *
 * @module scripts/gui/startMenu
 * @see {@link module:scripts/utils/eventBus.EVENTS}
 */
import { EVENTS } from "../utils/eventBus.js";
import { isMobileDevice } from "../utils/device.js";

/**
 * Base configuration for items in the "All Programs" flyout menu.
 * Social media links are dynamically appended to this list.
 * Each object defines a menu item or separator.
 * @type {Array<object>}
 * @property {string} type - Type of item ("program", "separator", "link").
 * @property {string} [programName] - Key for programData if type is "program".
 * @property {string} icon - Path to the menu item's icon.
 * @property {string} label - Display text for the menu item.
 * @property {string} [url] - URL if type is "link".
 * @property {boolean} [disabled=false] - If true, the item is visually disabled.
 * @private
 */
const ALL_PROGRAMS_ITEMS_BASE = [
  // Main apps first
  {
    type: "program",
    programName: "about",
    icon: "./assets/gui/desktop/about.webp",
    label: "About Me",
  },
  {
    type: "program",
    programName: "projects",
    icon: "./assets/gui/desktop/projects.webp",
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
  { type: "separator" },
  {
    type: "program",
    programName: "my-pictures",
    icon: "./assets/gui/start-menu/photos.webp",
    label: "My Photos",
    disabled: true,
  },
  {
    type: "program",
    programName: "mediaPlayer",
    icon: "./assets/gui/start-menu/mediaPlayer.webp",
    label: "Media Player",
    disabled: true,
  },
  {
    type: "program",
    programName: "musicPlayer",
    icon: "./assets/gui/start-menu/music.webp",
    label: "Music Player",
    disabled: false,
  },
  {
    type: "program",
    programName: "notepad",
    icon: "./assets/gui/start-menu/notepad.webp",
    label: "Notepad",
    disabled: true,
  },
  {
    type: "program",
    programName: "cmd",
    icon: "./assets/gui/start-menu/cmd.webp",
    label: "Command Prompt",
    disabled: true,
  },
  { type: "separator" },
  // Socials will be appended dynamically
];

/**
 * Configuration for items in the "Recently Used" section of the Start Menu.
 * These are currently vanity items for display purposes and are marked as disabled.
 * @type {Array<object>}
 * @property {string} type - Always "program" for these items.
 * @property {string} programName - A unique key for the item.
 * @property {string} icon - Path to the item's icon.
 * @property {string} label - Display text for the item.
 * @property {boolean} [disabled=true] - If true, the item is visually disabled.
 * @private
 */
const RECENTLY_USED_ITEMS = [
  {
    type: "program",
    programName: "creative-cloud",
    icon: "./assets/gui/start-menu/vanity-apps/creative-cloud.webp",
    label: "Adobe Creative Cloud",
    disabled: true,
  },
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
    programName: "wordpress",
    icon: "./assets/gui/start-menu/vanity-apps/wordpress.webp",
    label: "Wordpress",
    disabled: true,
  },
  {
    type: "program",
    programName: "htmlcssjs",
    icon: "./assets/gui/start-menu/vanity-apps/htmlcssjs.webp",
    label: "HTML/CSS/JS",
    disabled: true,
  },
  {
    type: "program",
    programName: "program6",
    icon: "./assets/gui/start-menu/vanity-apps/blender.webp",
    label: "Blender 3D",
    disabled: true,
  },
  {
    type: "program",
    programName: "chatgpt",
    icon: "./assets/gui/start-menu/vanity-apps/chatgpt.webp",
    label: "ChatGPT",
    disabled: true,
  },
];

/** @type {Array<object>} Cache for social media link data loaded from `info.json`. */
let SOCIALS = [];
/** @type {object | null} Cache for system assets (e.g., user icon path) loaded from `system.json`. */
let systemAssets = null;

/**
 * Fetches system asset data (e.g., user icon path) from `system.json`.
 * Implements a simple cache (`systemAssets`) to avoid redundant fetches.
 * @async
 * @private
 * @function getSystemAssets
 * @returns {Promise<object>} A promise that resolves to the system assets object.
 *                            Returns an empty object on fetch failure.
 */
async function getSystemAssets() {
  if (systemAssets) return systemAssets;
  try {
    const response = await fetch("./system.json");
    systemAssets = await response.json();
    return systemAssets;
  } catch (_e) {
    systemAssets = {};
    return systemAssets;
  }
}

/**
 * Fetches social media link data from `info.json` and populates the `SOCIALS` array.
 * Also caches the full response in `infoData` for potential other uses.
 * @async
 * @private
 * @function loadSocials
 * @returns {Promise<object>} A promise that resolves to the full info.json content.
 *                            The `SOCIALS` array is updated as a side effect. On failure,
 *                            `SOCIALS` is an empty array and an empty object is returned.
 */
async function loadSocials() {
  try {
    const response = await fetch("./info.json");
    const info = await response.json();
    SOCIALS = Array.isArray(info.socials) ? info.socials : [];
    return info;
  } catch (_e) {
    SOCIALS = [];
    return {};
  }
}

/**
 * Builds an HTML string for a menu list from an array of item configurations.
 * @param {Array<object>} items - Array of menu item configuration objects.
 * @param {string} itemClass - Base CSS class for each `<li>` item.
 * @param {string} [ulClass] - Optional CSS class for the `<ul>` element.
 * @returns {string} The generated HTML string for the menu.
 * @private
 */
function buildMenuHTML(items, itemClass, ulClass) {
  return (
    `<ul${ulClass ? ` class="${ulClass}"` : ""}>` +
    items
      .map((item) => {
        if (item.type === "separator") {
          return `<li class="${itemClass}-separator"></li>`;
        } else if (item.type === "program") {
          return (
            `<li class="${itemClass}-item${item.disabled ? " disabled" : ""}" data-action="open-program" data-program-name="${item.programName}">
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

/**
 * Attaches visual feedback event listeners (mousedown, mouseup, mouseleave, mouseout)
 * to menu items within a given menu element.
 * This provides the "clicked" visual state for menu items.
 * @param {HTMLElement} menuElement - The parent menu element containing the items.
 * @param {string} itemSelector - CSS selector to identify the menu items.
 * @private
 * @returns {void} Nothing.
 */
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
 * @class StartMenu
 * @description Manages the Windows XP Start Menu component, including its structure,
 * content (programs, social links, recently used items), display logic,
 * and user interactions.
 */
export default class StartMenu {
  /**
   * Constructs the StartMenu manager.
   * @param {EventBus} eventBus - The global event bus instance.
   * @see {@link module:scripts/utils/eventBus.EventBus}
   */
  constructor(eventBus) {
    /** @type {EventBus} The global event bus instance for inter-component communication. */
    this.eventBus = eventBus;
    /** @type {HTMLElement} The main Start Button DOM element. */
    this.startButton = document.getElementById("start-button");
    /** @type {HTMLElement | null} The main Start Menu DOM element. Created dynamically. */
    this.startMenu = null;
    /** @type {HTMLElement | null} The "All Programs" flyout menu DOM element. Created dynamically. */
    this.allProgramsMenu = null;
    /** @type {HTMLElement | null} The "Recently Used" flyout menu DOM element. Created dynamically. */
    this.recentlyUsedMenu = null;
    /** @type {HTMLElement | null} Tracks the currently active content click overlay (if any) to manage its state. */
    this.activeWindowOverlay = null; // Keep track of which overlay is active
    /** @type {object} Stores data fetched from `info.json`, primarily for user details and social links. */
    this.infoData = {}; // Initialize infoData on the instance
    /** @type {object | null} Stores data fetched from `system.json`, primarily for system asset paths like user icons. */
    this.systemAssets = null; // Initialize systemAssets on the instance

    this._init();

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
   * Asynchronously initializes the Start Menu by loading necessary data (socials, system assets)
   * and then setting up the UI elements and event listeners.
   * @async
   * @private
   * @returns {Promise<void>} A promise that resolves when initialization is complete.
   */
  async _init() {
    this.infoData = await loadSocials(); // Store fetched info data
    this.systemAssets = await getSystemAssets(); // Fetch system assets before creating menu element
    this.createStartMenuElement();
    this.setupEventListeners();
  }

  /**
   * Creates the main Start Menu DOM element and appends it to the body.
   * @description If an existing Start Menu element is found, it's removed first.
   * Populates the menu using `getMenuTemplate`, sets the username,
   * and then initializes submenus and item event handlers.
   * @returns {void} Nothing.
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

    // Dynamically set username from this.infoData (already fetched)
    const name = this.infoData?.contact?.name || "Mitch Ivin";
    startMenu.querySelectorAll(".menutopbar .username").forEach((span) => {
      span.textContent = name;
    });

    this.createAllProgramsMenu();
    this.createRecentlyUsedMenu();
    this.setupMenuItems();
    this._setupDelegatedEventHandlers();
  }

  /**
   * Creates a submenu DOM element if it doesn't already exist and appends it to the body.
   * @param {string} className - The CSS class for the submenu container.
   * @param {string} menuHTML - The inner HTML content for the submenu.
   * @param {string} propertyName - The name of the class property (e.g., `this.allProgramsMenu`)
   *                              to which the created submenu element will be assigned.
   * @returns {HTMLElement} The created or existing submenu DOM element.
   * @private
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
   * A generalized helper function to create a submenu, populate it with items,
   * and attach standard menu item interaction effects.
   * @param {object} options - Configuration options for creating the menu.
   * @param {Array<object>} options.items - Array of item configurations for the menu.
   * @param {string} options.itemClass - Base CSS class for individual menu items.
   * @param {string} [options.ulClass] - Optional CSS class for the `<ul>` element.
   * @param {string} options.menuClass - CSS class for the submenu's container div.
   * @param {string} options.propertyName - Class property name to store the created menu element.
   * @param {string} options.itemSelector - CSS selector for the items within the created menu.
   * @param {boolean} [options.attachClickHandler=false] - If true, attaches a generic click handler (usually for submenus).
   * @returns {HTMLElement} The created submenu element.
   * @private
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
   * Creates the "All Programs" flyout menu element.
   * @description Uses the `_createMenuWithEffects` helper to build the menu
   * from `getAllProgramsItems()` and attaches necessary event handlers.
   * The created element is stored in `this.allProgramsMenu`.
   * @returns {void} Nothing.
   */
  createAllProgramsMenu() {
    this._createMenuWithEffects({
      items: getAllProgramsItems(),
      itemClass: "all-programs",
      ulClass: "all-programs-items",
      menuClass: "all-programs-menu",
      propertyName: "allProgramsMenu",
      itemSelector: ".all-programs-item",
      attachClickHandler: true,
    });
  }

  /**
   * Creates the "Recently Used" programs section/menu element.
   * @description Uses the `_createMenuWithEffects` helper to build the menu
   * from `RECENTLY_USED_ITEMS`. This menu currently contains vanity items.
   * The created element is stored in `this.recentlyUsedMenu`.
   * @returns {void} Nothing.
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
   * Generates the complete HTML string for the main Start Menu structure.
   * @description This complex method dynamically constructs the Start Menu layout,
   * including the user panel, pinned items, recently used section placeholder,
   * and the bottom control bar (Log Off, Turn Off Computer).
   * It uses `renderMenuItem` to generate individual item HTML and adapts content
   * based on device type (mobile/desktop) and fetched system/social data.
   * @returns {string} The HTML string for the Start Menu.
   * @private
   */
  getMenuTemplate() {
    /**
     * Renders the HTML for a single Start Menu item.
     * @param {object} itemConfig - Configuration object for the menu item.
     * @param {string} itemConfig.id - Unique ID for the menu item (often programName).
     * @param {string} itemConfig.icon - Path to the item's icon.
     * @param {string} itemConfig.title - Main display text for the item.
     * @param {string} [itemConfig.description] - Optional subtitle or description.
     * @param {string} [itemConfig.programName] - Program key if it launches a program.
     * @param {string} [itemConfig.action] - Data action attribute (e.g., "open-program", "open-url").
     * @param {string} [itemConfig.url] - URL if the action is "open-url".
     * @param {boolean} [itemConfig.disabledOverride] - Explicitly sets the disabled state, overriding default logic.
     * @returns {string} HTML string for the menu item `<li>`.
     * @private
     */
    function renderMenuItem({
      id,
      icon,
      title,
      description,
      programName,
      action,
      url,
      disabledOverride, // New parameter to force disable state
    }) {
      const programsAlwaysDisabled = [
        "mediaPlayer",
        "my-pictures",
        "musicPlayer",
        "notepad",
        "cmd",
      ];
      // Determine disable state:
      // 1. If disabledOverride is explicitly boolean, use it.
      // 2. Otherwise, check if the programName is in programsAlwaysDisabled.
      const shouldDisable =
        typeof disabledOverride === "boolean"
          ? disabledOverride
          : programsAlwaysDisabled.includes(programName);

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
      const isProjects = (programName || id) === "projects";
      const titleSpan = `<span class="item-title${isProjects ? " projects-bold" : ""}">${title}</span>`;
      return `<li class="menu-item${disabledClass}" id="menu-${programName || id}" ${dataAction} ${dataProgram} ${dataUrl} tabindex="${shouldDisable ? "-1" : "0"}" aria-disabled="${shouldDisable ? "true" : "false"}">
        <img src="${icon}" alt="${title}">
        <div class="item-content">
          ${titleSpan}
          ${description ? `<span class="item-description">${description}</span>` : ""}
        </div>
      </li>`;
    }

    const mobile = isMobileDevice();
    const userPic =
      this.systemAssets?.userIcon || "./assets/gui/boot/userlogin.webp";
    const userName = this.infoData?.contact?.name || "Mitch Ivin"; // Already correctly using this.infoData for name

    // Use SOCIALS array (populated by loadSocials via this.infoData)
    const socialItems = SOCIALS.map((social) => ({
      id: social.key,
      icon: social.icon
        ? "./" + social.icon.replace(/^\.\//, "").replace(/^\//, "")
        : "",
      title: social.name,
      url: social.url,
      action: "open-url",
      disabledOverride: false,
    }));

    const appItemsToSwap = [
      {
        id: "mediaPlayer",
        icon: "./assets/gui/start-menu/mediaPlayer.webp",
        title: "Media Player",
        programName: "mediaPlayer",
        action: "open-program",
        disabledOverride: true,
      },
      {
        id: "my-pictures",
        icon: "./assets/gui/start-menu/photos.webp",
        title: "My Photos",
        programName: "my-pictures",
        action: "open-program",
        disabledOverride: true,
      },
      {
        id: "musicPlayer",
        icon: "./assets/gui/start-menu/music.webp",
        title: "Music Player",
        programName: "musicPlayer",
        action: "open-program",
        disabledOverride: isMobileDevice(), // Conditionally disable on mobile
      },
    ];

    let leftSlot1, leftSlot2, leftSlot3;
    let rightSlot1Desktop, rightSlot2Desktop, rightSlot3Desktop; // Renamed for clarity
    let rightSlot1Mobile, rightSlot2Mobile, rightSlot3Mobile;

    if (mobile) {
      // Reordered for mobile: LinkedIn, GitHub, Instagram
      leftSlot1 = socialItems[2]; // LinkedIn
      leftSlot2 = socialItems[1]; // GitHub
      leftSlot3 = socialItems[0]; // Instagram
      // On mobile, these slots in the right column will be the app items
      rightSlot1Mobile = appItemsToSwap[0];
      rightSlot2Mobile = appItemsToSwap[1];
      rightSlot3Mobile = appItemsToSwap[2];
    } else {
      // New order for desktop slots 5, 6, 7:
      leftSlot1 = appItemsToSwap[1]; // My Photos
      leftSlot2 = appItemsToSwap[2]; // Music Player
      leftSlot3 = appItemsToSwap[0]; // Media Player
      // On desktop, these slots in the right column will be the social items
      rightSlot1Desktop = socialItems[0];
      rightSlot2Desktop = socialItems[1];
      rightSlot3Desktop = socialItems[2];
    }

    const notepadConfig = {
      id: "notepad",
      icon: "./assets/gui/start-menu/notepad.webp",
      title: "Notepad",
      programName: "notepad",
      action: "open-program",
    };

    const cmdConfig = {
      id: "cmd",
      icon: "./assets/gui/start-menu/cmd.webp",
      title: "Command Prompt",
      programName: "cmd",
      action: "open-program",
    };

    const recentlyUsedHTML = `
      <li class="menu-item" id="menu-program4" data-action="toggle-recently-used">
        <img src="./assets/gui/start-menu/recently-used.webp" alt="Recently Used">
        <div class="item-content">
          <span class="item-title">Recently Used</span>
        </div>
      </li>`;

    let middleRightHTML;
    if (mobile) {
      middleRightHTML = `
        ${renderMenuItem(rightSlot1Mobile)}
        ${renderMenuItem(rightSlot2Mobile)}
        ${renderMenuItem(rightSlot3Mobile)}
        <li class="menu-divider divider-darkblue"><hr class="divider"></li>
        ${recentlyUsedHTML}
        <li class="menu-divider divider-darkblue"><hr class="divider"></li>
        ${renderMenuItem(notepadConfig)}
        ${renderMenuItem(cmdConfig)}
      `;
    } else {
      middleRightHTML = `
        ${renderMenuItem(rightSlot1Desktop)}
        ${renderMenuItem(rightSlot2Desktop)}
        ${renderMenuItem(rightSlot3Desktop)}
        <li class="menu-divider divider-darkblue"><hr class="divider"></li>
        ${renderMenuItem(notepadConfig)}
        ${renderMenuItem(cmdConfig)}
        <li class="menu-divider divider-darkblue"><hr class="divider"></li>
        ${recentlyUsedHTML}
      `;
    }

    return `
      <div class="menutopbar">
        <img src="${userPic}" alt="User" class="userpicture">
        <span class="username">${userName}</span>
      </div>
      <div class="start-menu-middle">
        <div class="middle-section middle-left">
          <ul class="menu-items">
            ${renderMenuItem({
              id: "projects",
              icon: "./assets/gui/desktop/projects.webp",
              title: "My Projects",
              description: "View my work",
              programName: "projects",
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
              id: leftSlot1.id,
              icon: leftSlot1.icon,
              title: leftSlot1.title,
              programName: leftSlot1.programName,
              action: leftSlot1.action,
              url: leftSlot1.url,
              disabledOverride: leftSlot1.disabledOverride,
            })}
            ${renderMenuItem({
              id: leftSlot2.id,
              icon: leftSlot2.icon,
              title: leftSlot2.title,
              programName: leftSlot2.programName,
              action: leftSlot2.action,
              url: leftSlot2.url,
              disabledOverride: leftSlot2.disabledOverride,
            })}
            ${renderMenuItem({
              id: leftSlot3.id,
              icon: leftSlot3.icon,
              title: leftSlot3.title,
              programName: leftSlot3.programName,
              action: leftSlot3.action,
              url: leftSlot3.url,
              disabledOverride: leftSlot3.disabledOverride,
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
            ${middleRightHTML}
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
      this.eventBus.publish(EVENTS.LOG_OFF_CONFIRMATION_REQUESTED, {
        dialogType: "logOff",
      });
      this.closeStartMenu();
    } else if (action === "shut-down") {
      this.eventBus.publish(EVENTS.LOG_OFF_CONFIRMATION_REQUESTED, {
        dialogType: "shutDown",
      });
      this.closeStartMenu();
    }
  }

  /**
   * Sets up delegated event listeners for the start menu.
   */
  _setupDelegatedEventHandlers() {
    // Only attach to the main startMenu here.
    // Submenus (allProgramsMenu, recentlyUsedMenu) have their handlers attached
    // during their creation in _createMenuWithEffects.
    if (this.startMenu) {
      this.startMenu.addEventListener(
        "click",
        this._handleMenuClick.bind(this),
      );
    }
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
  /**
   * Manages the display and state of a content click overlay on application windows.
   * When the Start Menu is open, an overlay is typically shown on the active application window.
   * This overlay allows clicks to pass to the window content but also triggers the Start Menu to close.
   * This method activates the overlay for the given `activeWindowId` and deactivates any previous one.
   * If `activeWindowId` is null, it deactivates any active overlay.
   * @param {string | null} activeWindowId - The ID of the window to activate the overlay for, or null to deactivate all.
   * @private
   * @returns {void} Nothing.
   */
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
    document.querySelectorAll("iframe").forEach((iframe) => {
      iframe.addEventListener("focus", this._iframeFocusHandler);
    });
  }

  /**
   * Remove focus listeners from all iframes.
   */
  removeIframeFocusListeners() {
    if (!this._iframeFocusHandler) return;
    document.querySelectorAll("iframe").forEach((iframe) => {
      iframe.removeEventListener("focus", this._iframeFocusHandler);
    });
    this._iframeFocusHandler = null;
  }

  /**
   * Attach blur listener to window to close the Start Menu when window loses focus (e.g., clicking into an iframe).
   */
  attachWindowBlurListener() {
    this._windowBlurHandler = () => this.closeStartMenu();
    window.addEventListener("blur", this._windowBlurHandler);
  }

  /**
   * Remove blur listener from window.
   */
  removeWindowBlurListener() {
    if (this._windowBlurHandler) {
      window.removeEventListener("blur", this._windowBlurHandler);
      this._windowBlurHandler = null;
    }
  }
}

// ==================================================
// END Start Menu Module
// ==================================================

function getAllProgramsItems() {
  const allItems = [
    ...ALL_PROGRAMS_ITEMS_BASE,
    ...SOCIALS.map((social) => ({
      type: "url",
      url: social.url,
      icon: social.icon
        ? "./" + social.icon.replace(/^\.\//, "").replace(/^\//, "")
        : "", // Corrected path
      label: social.name,
    })),
  ];

  // If on mobile, find and disable the musicPlayer program
  if (isMobileDevice()) {
    const musicPlayerItem = allItems.find(
      (item) => item.type === "program" && item.programName === "musicPlayer",
    );
    if (musicPlayerItem) {
      musicPlayerItem.disabled = true;
    }
  }

  return allItems;
}

document.addEventListener("DOMContentLoaded", async () => {
  // The .menutopbar .userpicture in StartMenu is now handled by getMenuTemplate directly. No additional DOM update is needed here.
  // The following code in DOMContentLoaded for login screen elements is fine and separate:
  // document.querySelectorAll('.login-screen .user img').forEach(img => { ... });
  // document.querySelectorAll('.login-screen .name').forEach(span => { ... });
  // So, no changes needed for those parts if they exist elsewhere or are intended for non-StartMenu elements.
  // The part for boot logo is also fine:
  // const bootLogo = document.getElementById("boot-logo");
  // if (bootLogo && system.loading) bootLogo.src = system.loading;
  // document.querySelectorAll(".xp-logo-image").forEach(img => { ... });
});
