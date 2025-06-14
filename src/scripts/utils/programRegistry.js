/*
 * programRegistry.js — Centralized registry for all application configurations in the Windows XP simulation.
 * Includes window properties, icons, menu bars, toolbars, and helper functions for consistent program definitions.
 * @file src/scripts/utils/programRegistry.js
 */

import { isMobileDevice } from "./device.js";

// ==================================================
//  Program Registry for Windows XP Simulation
// ==================================================

// ===== Default Templates & Internal Helper Functions =====
// Provides base configuration templates and utility functions for program definitions.

/**
 * Default configuration templates used by `createProgram`.
 * Provides base settings for program properties like iframe dimensions.
 * @type {object}
 * @property {object} iframe Default settings for iframe-based programs.
 * @property {string} iframe.template Default template key.
 * @property {object} iframe.dimensions Default width and height.
 * @property {object} iframe.minDimensions Default minimum dimensions.
 * @private
 */
const defaults = {
  iframe: {
    template: "iframe-standard",
    dimensions: { width: 550, height: 400 },
    minDimensions: { width: 250, height: 200 }, // Default minimum dimensions
  },
};

/**
 * Generates a standardized window ID from a program key.
 * Appends "-window" to the program key.
 * @param {string} name - The unique program key (e.g., "notepad").
 * @returns {string} The formatted window ID (e.g., "notepad-window").
 * @private
 */
const makeId = (name) => `${name}-window`;

/**
 * Factory function to create a program configuration object with consistent properties.
 * Merges default settings with program-specific properties.
 * @param {string} key - Unique program identifier (e.g., "notepad").
 * @param {string} title - Window title displayed in the title bar.
 * @param {string} icon - Filename of the program icon (e.g., "start-menu/notepad.webp").
 *                        This path is relative to `./assets/gui/`.
 * @param {object} [extraProps={}] - Additional program-specific properties to override or extend defaults.
 * @returns {object} The complete program configuration object.
 * @private
 */
const createProgram = (key, title, icon, extraProps = {}) => ({
  id: makeId(key),
  title,
  icon: `./assets/gui/${icon}`,
  ...defaults.iframe, // Merge in default iframe settings
  // Merge extraProps.minDimensions deeply if it exists, otherwise use default
  minDimensions: {
    ...defaults.iframe.minDimensions,
    ...(extraProps.minDimensions || {}),
  },
  ...extraProps, // Override or extend with program-specific properties
});

// ===== Shared Menu Dropdown Configurations =====
// Standardized dropdown menu configurations for reuse across multiple programs.

/**
 * Standard configuration for a "View" menu dropdown.
 * Includes options for Close, Maximize, and Minimize.
 * Maximize is disabled on mobile devices.
 * @type {Array<object>} // Array of menu item configuration objects
 * @private
 */
const VIEW_DROPDOWN = [
  { key: "close", text: "Close", enabled: true, action: "exitProgram" },
  { type: "separator" },
  {
    key: "maximize",
    text: "Maximize",
    enabled: !isMobileDevice(), // Disable maximize on mobile
    action: "maximizeWindow",
  },
  {
    key: "minimize",
    text: "Minimize",
    enabled: true,
    action: "minimizeWindow",
  },
];

/**
 * Common "File" menu dropdown configuration where only "Exit" is enabled.
 * Used for programs with minimal file operations.
 * @type {Array<object>} // Array of menu item configuration objects
 * @private
 */
const FILE_DROPDOWN_EXIT_ONLY = [
  { key: "open", text: "Open...", enabled: false, action: "fileOpen" },
  { key: "saveAs", text: "Save as...", enabled: false, action: "fileSaveAs" },
  { type: "separator" },
  { key: "print", text: "Print", enabled: false, action: "filePrint" },
  {
    key: "pageSetup",
    text: "Print Setup",
    enabled: false,
    action: "pageSetup",
  },
  { type: "separator" },
  { key: "exit", text: "Exit", enabled: true, action: "exitProgram" },
];

/**
 * "File" menu dropdown configuration tailored for "Notepad".
 * Includes "New", with other file operations typically disabled in this simulation.
 * @type {Array<object>} // Array of menu item configuration objects
 * @private
 */
const FILE_DROPDOWN_NOTEPAD = [
  { key: "new", text: "New", enabled: true, action: "fileNew" },
  { key: "open", text: "Open...", enabled: false, action: "fileOpen" },
  { key: "save", text: "Save", enabled: false, action: "fileSave" },
  { key: "saveAs", text: "Save As...", enabled: false, action: "fileSaveAs" },
  { type: "separator" },
  {
    key: "pageSetup",
    text: "Page Setup...",
    enabled: false,
    action: "pageSetup",
  },
  { key: "print", text: "Print...", enabled: false, action: "filePrint" },
  { type: "separator" },
  { key: "exit", text: "Exit", enabled: true, action: "exitProgram" },
];

/**
 * Custom "File" menu dropdown configuration for the "Contact Me" application.
 * Includes app-specific actions like "New Message" and "Send Message".
 * @type {Array<object>} // Array of menu item configuration objects
 * @private
 */
const FILE_DROPDOWN_CONTACT = [
  {
    key: "newMessage",
    text: "New Message",
    enabled: false,
    action: "newMessage",
  },
  {
    key: "sendMessage",
    text: "Send Message",
    enabled: false,
    action: "sendMessage",
  },
  { type: "separator" },
  { key: "print", text: "Print", enabled: false, action: "filePrint" },
  {
    key: "pageSetup",
    text: "Print Setup",
    enabled: false,
    action: "pageSetup",
  },
  { type: "separator" },
  { key: "exit", text: "Exit", enabled: true, action: "exitProgram" },
];

// ===== Program Data Registry =====
// The main registry of all application configurations, keyed by unique program identifier.
// Each entry defines all properties needed to create and manage that program's window.

/**
 * @typedef {object} ProgramConfig
 * @property {string} id - The unique window ID, typically `key + "-window"`.
 * @property {string} title - The title displayed in the window's title bar.
 * @property {string} icon - The full path to the program's icon.
 * @property {string} [template="iframe-standard"] - The window template to use.
 * @property {object} dimensions - Default window dimensions.
 * @property {number} dimensions.width - Default width in pixels.
 * @property {number} dimensions.height - Default height in pixels.
 * @property {string} [contentSrc] - Path to the iframe content for the program.
 * @property {object} [menuBarConfig] - Configuration for the window's menu bar.
 * @property {Array<object>} menuBarConfig.items - Array of menu items.
 * @property {object} [toolBarConfig] - Configuration for the window's toolbar.
 * @property {Array<object>} toolBarConfig.buttons - Array of toolbar buttons.
 * @property {boolean} [isSingleton=false] - If true, only one instance of the program can be open.
 * @property {boolean} [hideFromTaskbar=false] - If true, the program won't show on the taskbar.
 * @property {string} [tooltip] - Tooltip text for the program's icon.
 * @property {boolean} [isFullScreen=false] - If true, attempts to open in a full-screen like mode.
 * @property {boolean} [isUtility=false] - If true, might have different handling (e.g., no close button).
 * @property {string} [instanceGroup] - Groups instances for specific behaviors (e.g. "explorer").
 * @property {boolean} [resizable=true] - Whether the window is resizable.
 * @property {object} [minDimensions] - Minimum dimensions for resizing.
 * @property {number} minDimensions.width - Minimum width.
 * @property {number} minDimensions.height - Minimum height.
 */
const programData = {
  // Communication and Messaging
  mediaPlayer: createProgram(
    "mediaPlayer",
    "Media Player",
    "start-menu/mediaPlayer.webp",
    {
      dimensions: { width: 750, height: 500 },
    },
  ),
  musicPlayer: createProgram(
    "musicPlayer",
    "Music Player",
    "start-menu/music.webp",
    {
      appPath: "src/apps/musicPlayer/musicplayer.html",
      dimensions: { width: 420, height: 255 },
      minDimensions: { width: 420, height: 255 },
      resizable: false,
      canMaximize: false,
      position: { type: "custom", x: 24, y: 24, relativeTo: "right" },
    },
  ),

  // System and Utility Programs
  cmd: createProgram("cmd", "Command Prompt", "start-menu/cmd.webp", {
    dimensions: { width: 500, height: 350 },
  }),
  notepad: createProgram("notepad", "Notepad", "start-menu/notepad.webp", {
    menuBarConfig: {
      items: [
        {
          key: "file",
          text: "File",
          enabled: true,
          dropdown: FILE_DROPDOWN_NOTEPAD,
        },
        { key: "edit", text: "Edit", enabled: false },
        { key: "format", text: "Format", enabled: false },
        {
          key: "view",
          text: "View",
          enabled: true,
          dropdown: VIEW_DROPDOWN,
        },
        { key: "help", text: "Help", enabled: false },
      ],
    },
  }),

  // Portfolio Content
  about: createProgram("about", "About Me", "desktop/about.webp", {
    dimensions: { width: 800, height: 600 },
    minDimensions: { width: 430, height: 400 },
    statusBarText: "Viewing Mitch's background",
    appPath: "src/apps/about/about.html",
    toolbarConfig: {
      buttons: [
        {
          key: "previous",
          enabled: false,
          icon: "./assets/gui/toolbar/back.webp",
          text: "Previous",
          action: "navigatePrevious",
        },
        {
          key: "next",
          enabled: false,
          icon: "./assets/gui/toolbar/forward.webp",
          text: "Next",
          action: "navigateNext",
        },
        { type: "separator", desktopOnly: true },
        {
          key: "projects",
          enabled: true,
          icon: "./assets/gui/desktop/projects.webp",
          text: "My Projects",
          action: "openProjects",
        },
        {
          key: "resume",
          enabled: true,
          icon: "./assets/gui/desktop/resume.webp",
          text: "My Resume",
          action: "openResume",
        },
        { type: "separator" },
        {
          key: "views",
          enabled: false,
          icon: "./assets/gui/toolbar/views.webp",
          text: null,
          action: "toggleViews",
        },
      ],
    },
    addressBarConfig: {
      enabled: true,
      icon: "./assets/gui/desktop/about.webp",
      title: "About Me",
      canNavigate: false,
    },
    menuBarConfig: {
      items: [
        {
          key: "file",
          text: "File",
          enabled: true,
          dropdown: FILE_DROPDOWN_EXIT_ONLY,
        },
        {
          key: "view",
          text: "View",
          enabled: true,
          dropdown: VIEW_DROPDOWN,
        },
        { key: "help", text: "Help", enabled: false },
      ],
    },
  }),
  resume: createProgram("resume", "My Resume", "desktop/resume.webp", {
    dimensions: { width: 600, height: 725 },
    minDimensions: { width: 305, height: 350 },
    statusBarText: isMobileDevice()
      ? "Tap to zoom & pan"
      : "Click to zoom & pan",
    appPath: "src/apps/resume/resume.html",
    menuBarConfig: {
      items: [
        {
          key: "file",
          text: "File",
          enabled: true,
          dropdown: FILE_DROPDOWN_EXIT_ONLY,
        },
        { key: "view", text: "View", enabled: true, dropdown: VIEW_DROPDOWN },
        { key: "help", text: "Help", enabled: false },
      ],
    },
    toolbarConfig: {
      buttons: [
        {
          key: "print",
          enabled: false,
          icon: "./assets/gui/toolbar/print.webp",
          text: "Print",
          desktopOnly: true,
          tooltip: "Print (Disabled)",
        },
        { type: "separator", desktopOnly: true },
        {
          key: "email",
          enabled: true,
          icon: "./assets/gui/desktop/contact.webp",
          text: "Contact Me",
          action: "openContact",
        },
        {
          key: "save",
          enabled: true,
          icon: "./assets/gui/toolbar/save.webp",
          text: "Save",
          action: "saveResume",
        },
        { type: "separator", desktopOnly: true },
        {
          key: "up",
          enabled: false,
          icon: "./assets/gui/toolbar/up.webp",
          text: null,
          desktopOnly: true,
          tooltip: "Up (Disabled)",
        },
      ],
    },
  }),

  // Media Programs
  "my-pictures": createProgram(
    "my-pictures",
    "My Photos",
    "start-menu/photos.webp",
    {
      dimensions: { width: 440, height: 561 },
      toolbarConfig: {
        buttons: [
          {
            key: "previous",
            enabled: true,
            icon: "./assets/gui/toolbar/back.webp",
            text: "Back",
            action: "navigateBack",
          },
          {
            key: "forward",
            enabled: true,
            icon: "./assets/gui/toolbar/forward.webp",
            text: "Next",
            action: "nextImage",
          },
          {
            key: "print",
            enabled: false,
            icon: "./assets/gui/toolbar/print.webp",
            text: null,
          },
          {
            key: "save",
            enabled: false,
            icon: "./assets/gui/toolbar/save.webp",
            text: null,
          },
          {
            key: "delete",
            enabled: false,
            icon: "./assets/gui/toolbar/delete.webp",
            text: null,
          },
        ],
      },
      menuBarConfig: {
        items: [
          {
            key: "file",
            text: "File",
            enabled: true,
            dropdown: FILE_DROPDOWN_EXIT_ONLY,
          },
          { key: "edit", text: "Edit", enabled: false },
          { key: "view", text: "View", enabled: true, dropdown: VIEW_DROPDOWN },
          { key: "help", text: "Help", enabled: false },
        ],
      },
    },
  ),

  // Project Showcase Programs
  projects: createProgram("projects", "My Projects", "desktop/projects.webp", {
    dimensions: { width: 1060, height: 800 },
    minDimensions: { width: 790, height: 500 },
    statusBarText: isMobileDevice()
      ? "Open a project and navigate with the toolbar or swipe"
      : "Open a project and navigate with the toolbar",
    appPath: "src/apps/projects/projects.html",
    addressBarConfig: {
      enabled: true,
      icon: "./assets/gui/desktop/projects.webp",
      title: "https://www.myprojects.com",
      canNavigate: false,
    },
    menuBarConfig: {
      items: [
        {
          key: "file",
          text: "File",
          enabled: true,
          dropdown: FILE_DROPDOWN_EXIT_ONLY,
        },
        { key: "view", text: "View", enabled: true, dropdown: VIEW_DROPDOWN },
        { key: "tools", text: "Tools", enabled: false },
        { key: "help", text: "Help", enabled: false },
      ],
    },
    toolbarConfig: {
      buttons: [
        {
          key: "home",
          enabled: false,
          icon: "./assets/gui/toolbar/home.webp",
          text: "Home",
          action: "navigateHome",
        },
        { type: "separator", desktopOnly: true },
        {
          key: "previous",
          enabled: false,
          icon: "./assets/gui/toolbar/back.webp",
          text: "Previous",
          action: "navigatePrevious",
        },
        {
          key: "next",
          enabled: false,
          icon: "./assets/gui/toolbar/forward.webp",
          text: "Next",
          action: "navigateNext",
        },
        {
          key: "view-description",
          enabled: false,
          icon: "./assets/gui/toolbar/desc.webp",
          text: "Show more",
          action: "viewDescription",
        },
        { type: "separator" },
        {
          key: "search",
          enabled: false,
          icon: "./assets/gui/toolbar/search.webp",
          text: null,
          desktopOnly: true,
          tooltip: "Search (Disabled)",
        },
        {
          key: "favorites",
          enabled: false,
          icon: "./assets/gui/toolbar/favorites.webp",
          text: "Favorites",
          desktopOnly: true,
          tooltip: "Favorites (Disabled)",
        },
        { type: "separator", desktopOnly: true },
        {
          key: "print",
          enabled: false,
          icon: "./assets/gui/toolbar/print.webp",
          text: "Print",
          desktopOnly: true,
          tooltip: "Print (Disabled)",
        },
      ],
    },
  }),
  contact: createProgram("contact", "Contact Me", "desktop/contact.webp", {
    dimensions: { width: 600, height: 450 },
    minDimensions: { width: 470, height: 300 }, // Custom minimum dimensions for Contact Me
    statusBarText: "Get in touch with Mitch",
    appPath: "src/apps/contact/contact.html",
    toolbarConfig: {
      buttons: [
        {
          key: "send",
          enabled: true,
          icon: "./assets/gui/toolbar/send.webp",
          text: "Send Message",
          action: "sendMessage",
        },
        {
          key: "new",
          enabled: true,
          icon: "./assets/gui/toolbar/new.webp",
          text: "New Message",
          action: "newMessage",
        },
        { type: "separator", desktopOnly: true },
        {
          key: "cut",
          enabled: false,
          icon: "./assets/gui/toolbar/cut.webp",
          text: null,
        },
        {
          key: "copy",
          enabled: false,
          icon: "./assets/gui/toolbar/copy.webp",
          text: null,
        },
        {
          key: "paste",
          enabled: false,
          icon: "./assets/gui/toolbar/paste.webp",
          text: null,
        },
        { type: "separator" },
        { type: "socials" },
      ],
    },
    menuBarConfig: {
      items: [
        {
          key: "file",
          text: "File",
          enabled: true,
          dropdown: FILE_DROPDOWN_CONTACT,
        },
        { key: "edit", text: "Edit", enabled: false },
        { key: "view", text: "View", enabled: true, dropdown: VIEW_DROPDOWN },
        { key: "tools", text: "Tools", enabled: false },
        { key: "help", text: "Help", enabled: false },
      ],
    },
  }),

  // Special format entries with custom properties
};

export default programData;

// ==================================================
// END Program Registry
// ==================================================
