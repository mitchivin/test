/**
 * @fileoverview Program Registry for the Windows XP simulation
 *
 * Defines configuration data for all available applications including window properties,
 * dimensions, icons, and content sources. This centralized registry ensures consistent
 * program initialization throughout the application.
 *
 * @module programRegistry
 */

// ==================================================
//  Program Registry for Windows XP Simulation
// ==================================================

// =========================
// 1. Default Templates & Helpers
// =========================

/**
 * Default configuration templates for program properties
 *
 * @constant
 * @type {Object}
 */
// --- Default Window Size for All Programs ---
// The default window width and height for all programs are set here. If a program does not override these values, it will use these defaults.
const defaults = {
  iframe: {
    template: "iframe-standard",
    dimensions: { width: 550, height: 400 },
  },
};

/**
 * Generates a standardized window ID from program name
 *
 * @param {string} name - Program name
 * @returns {string} Formatted window ID
 */
const makeId = (name) => `${name}-window`;

/**
 * Base path for application content
 *
 * @constant
 * @type {string}
 */
const appPath = "./src/apps/";

/**
 * Creates a program configuration with consistent properties
 *
 * @param {string} key - Unique program identifier
 * @param {string} title - Window title displayed in titlebar
 * @param {string} icon - Relative path to program icon
 * @param {string} path - Path to application directory (relative to src/apps/)
 * @param {Object} [extraProps={}] - Additional program-specific properties
 * @returns {Object} Complete program configuration object
 */
const createProgram = (key, title, icon, path, extraProps = {}) => ({
  id: makeId(key),
  title,
  icon: `./assets/gui/${icon}`,
  ...defaults.iframe,
  appPath: `${appPath}${path}/index.html`,
  ...extraProps,
});

// =========================
// 2. Program Data Registry
// =========================

/**
 * Complete registry of all application configurations
 *
 * Each entry defines the properties needed to create and manage a program window,
 * including dimensions, content source, and UI behavior.
 *
 * @type {Object.<string, Object>}
 */
const programData = {
  // Communication and Messaging
  mediaPlayer: createProgram(
    "mediaPlayer",
    "Media Player",
    "start-menu/mediaPlayer.webp",
    "mediaPlayer",
    {
      dimensions: { width: 750, height: 500 },
    },
  ),

  // System and Utility Programs
  info: createProgram(
    "info",
    "System Information",
    "start-menu/help.webp",
    "info",
    {
      dimensions: { width: 390, height: 475 },
      canMinimize: false,
      canMaximize: false,
    },
  ),
  cmd: createProgram("cmd", "Command Prompt", "start-menu/cmd.webp", "cmd", {
    dimensions: { width: 500, height: 350 },
  }),
  notepad: createProgram(
    "notepad",
    "Notepad",
    "start-menu/notepad.webp",
    "notepad",
    // --- Add MenuBar Configuration for Notepad ---
    {
      menuBarConfig: {
        items: [
          {
            key: "file",
            text: "File",
            enabled: true,
            dropdown: [
              { key: "new", text: "New", enabled: false, action: "fileNew" },
              {
                key: "open",
                text: "Open...",
                enabled: false,
                action: "fileOpen",
              },
              { key: "save", text: "Save", enabled: false, action: "fileSave" },
              {
                key: "saveAs",
                text: "Save As...",
                enabled: false,
                action: "fileSaveAs",
              },
              { type: "separator" },
              {
                key: "pageSetup",
                text: "Page Setup...",
                enabled: false,
                action: "pageSetup",
              },
              {
                key: "print",
                text: "Print...",
                enabled: false,
                action: "filePrint",
              },
              { type: "separator" },
              {
                key: "exit",
                text: "Exit",
                enabled: true,
                action: "exitProgram",
              }, // Action to close window
            ],
          },
          { key: "edit", text: "Edit", enabled: false },
          { key: "format", text: "Format", enabled: false },
          { key: "view", text: "View", enabled: false },
          { key: "help", text: "Help", enabled: false },
        ],
      },
    },
    // --- End MenuBar Configuration ---
  ),

  // Portfolio Content
  about: createProgram("about", "About Me", "desktop/about.webp", "about", {
    dimensions: { width: 800, height: 600 },
    statusBarText: "Getting to know the designer",
    // --- Toolbar Configuration for About Me ---
    toolbarConfig: {
      buttons: [
        {
          key: "back",
          enabled: false,
          icon: "./assets/gui/toolbar/back.webp",
          text: "Back",
          action: "navigateBack",
        },
        {
          key: "forward",
          enabled: false,
          icon: "./assets/gui/toolbar/forward.webp",
          text: "Forward",
          action: "navigateForward",
        },
        {
          key: "up",
          enabled: false,
          icon: "./assets/gui/toolbar/up.webp",
          text: null,
        }, // Assuming up.webp for bent arrow
        { type: "separator" },
        {
          key: "photos",
          enabled: true,
          icon: "./assets/gui/start-menu/photos.webp",
          text: "My Photos",
          action: "openPhotos",
        }, // Use My Photos program icon
        {
          key: "videos",
          enabled: true,
          icon: "./assets/gui/start-menu/mediaPlayer.webp",
          text: "Media Player",
          action: "openMediaPlayer",
        }, // Use Media Player program icon
        { type: "separator" },
        {
          key: "views",
          enabled: false,
          icon: "./assets/gui/toolbar/views.webp",
          text: null,
        }, // Assuming views.webp for grid
      ],
    },
    // --- MenuBar Configuration for About Me ---
    menuBarConfig: {
      items: [
        {
          key: "file",
          text: "File",
          enabled: true,
          dropdown: [
            { key: "new", text: "New", enabled: false, action: "fileNew" },
            {
              key: "open",
              text: "Open...",
              enabled: false,
              action: "fileOpen",
            },
            { key: "save", text: "Save", enabled: false, action: "fileSave" },
            {
              key: "saveAs",
              text: "Save As...",
              enabled: false,
              action: "fileSaveAs",
            },
            { type: "separator" },
            {
              key: "pageSetup",
              text: "Page Setup...",
              enabled: false,
              action: "pageSetup",
            },
            {
              key: "print",
              text: "Print...",
              enabled: false,
              action: "filePrint",
            },
            { type: "separator" },
            { key: "exit", text: "Exit", enabled: true, action: "exitProgram" },
          ],
        },
        { key: "view", text: "View", enabled: false },
        { key: "help", text: "Help", enabled: false },
      ],
    },
    // --- End MenuBar Configuration ---
  }),
  contact: createProgram(
    "contact",
    "Contact Me",
    "desktop/contact.webp",
    "contact",
    {
      dimensions: { width: 600, height: 450 },
      statusBarText: "Let's start a conversation",
      toolbarConfig: {
        buttons: [
          {
            key: "send",
            enabled: true,
            icon: "./assets/gui/toolbar/send.webp",
            text: "Send",
            action: "sendMessage",
          },
          { type: "separator" },
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
          {
            key: "new",
            enabled: true,
            icon: "./assets/gui/toolbar/new.webp",
            text: "New",
            action: "newMessage",
          },
          {
            key: "attach",
            enabled: false,
            icon: "./assets/gui/toolbar/attach.webp",
            text: null,
          },
          { type: "separator" },
          {
            key: "sign",
            enabled: false,
            icon: "./assets/gui/toolbar/sign.webp",
            text: null,
          },
        ],
      },
      // --- MenuBar Configuration for Contact Me ---
      menuBarConfig: {
        items: [
          {
            key: "file",
            text: "File",
            enabled: true,
            dropdown: [
              { key: "new", text: "New", enabled: false, action: "fileNew" },
              {
                key: "open",
                text: "Open...",
                enabled: false,
                action: "fileOpen",
              },
              { key: "save", text: "Save", enabled: false, action: "fileSave" },
              {
                key: "saveAs",
                text: "Save As...",
                enabled: false,
                action: "fileSaveAs",
              },
              { type: "separator" },
              {
                key: "pageSetup",
                text: "Page Setup...",
                enabled: false,
                action: "pageSetup",
              },
              {
                key: "print",
                text: "Print...",
                enabled: false,
                action: "filePrint",
              },
              { type: "separator" },
              {
                key: "exit",
                text: "Exit",
                enabled: true,
                action: "exitProgram",
              },
            ],
          },
          { key: "edit", text: "Edit", enabled: false },
          { key: "view", text: "View", enabled: false },
          { key: "tools", text: "Tools", enabled: false },
          { key: "message", text: "Message", enabled: false },
          { key: "help", text: "Help", enabled: false },
        ],
      },
      // --- End MenuBar Configuration ---
    },
  ),
  resume: createProgram("resume", "My Resume", "desktop/resume.webp", "resume", {
    dimensions: { width: 700, height: 800 },
    statusBarText: "Skills and experience overview",
    toolbarConfig: {
      buttons: [
        {
          key: "actual-size",
          enabled: true,
          icon: "./assets/gui/toolbar/size.webp",
          text: null,
          action: "setActualSize",
        },
        {
          key: "zoom-out",
          enabled: true,
          icon: "./assets/gui/toolbar/zoomout.webp",
          text: null,
          action: "zoomOut",
        },
        {
          key: "zoom-in",
          enabled: true,
          icon: "./assets/gui/toolbar/zoomin.webp",
          text: "Zoom",
          action: "zoomIn",
        },
        { type: "separator" },
        {
          key: "print",
          enabled: false,
          icon: "./assets/gui/toolbar/print.webp",
          text: null,
        },
        { type: "separator" },
        {
          key: "email",
          enabled: true,
          icon: "./assets/gui/toolbar/email.webp",
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
      ],
    },
    // --- MenuBar Configuration for Resume ---
    menuBarConfig: {
      items: [
        {
          key: "file",
          text: "File",
          enabled: true,
          dropdown: [
            { key: "new", text: "New", enabled: false, action: "fileNew" },
            {
              key: "open",
              text: "Open...",
              enabled: false,
              action: "fileOpen",
            },
            { key: "save", text: "Save", enabled: false, action: "fileSave" },
            {
              key: "saveAs",
              text: "Save As...",
              enabled: false,
              action: "fileSaveAs",
            },
            { type: "separator" },
            {
              key: "pageSetup",
              text: "Page Setup...",
              enabled: false,
              action: "pageSetup",
            },
            {
              key: "print",
              text: "Print...",
              enabled: false,
              action: "filePrint",
            },
            { type: "separator" },
            { key: "exit", text: "Exit", enabled: true, action: "exitProgram" },
          ],
        },
        { key: "view", text: "View", enabled: false },
        { key: "tools", text: "Tools", enabled: false },
        { key: "help", text: "Help", enabled: false },
      ],
    },
    // --- End MenuBar Configuration ---
  }),

  // Media Programs
  "my-pictures": createProgram(
    "my-pictures",
    "My Photos",
    "start-menu/photos.webp",
    "photos",
    {
      dimensions: { width: 440, height: 561 },
      // --- Toolbar Configuration for My Photos (Updated) ---
      toolbarConfig: {
        buttons: [
          // Active Buttons
          {
            key: "previous",
            enabled: true,
            icon: "./assets/gui/toolbar/back.webp",
            text: null,
            action: "previousImage",
          },
          {
            key: "slideshow",
            enabled: true,
            icon: "./assets/gui/toolbar/slideshow.webp",
            text: null,
            action: "toggleSlideshow",
          },
          {
            key: "next",
            enabled: true,
            icon: "./assets/gui/toolbar/forward.webp",
            text: "Next",
            action: "nextImage",
          },
          { type: "separator" },
          // Disabled Buttons
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
          { type: "separator" },
          {
            key: "delete",
            enabled: false,
            icon: "./assets/gui/toolbar/delete.webp",
            text: null,
          },
        ],
      },
      // --- MenuBar Configuration for My Photos ---
      menuBarConfig: {
        items: [
          {
            key: "file",
            text: "File",
            enabled: true,
            dropdown: [
              { key: "new", text: "New", enabled: false, action: "fileNew" },
              {
                key: "open",
                text: "Open...",
                enabled: false,
                action: "fileOpen",
              },
              { key: "save", text: "Save", enabled: false, action: "fileSave" },
              {
                key: "saveAs",
                text: "Save As...",
                enabled: false,
                action: "fileSaveAs",
              },
              { type: "separator" },
              {
                key: "pageSetup",
                text: "Page Setup...",
                enabled: false,
                action: "pageSetup",
              },
              {
                key: "print",
                text: "Print...",
                enabled: false,
                action: "filePrint",
              },
              { type: "separator" },
              {
                key: "exit",
                text: "Exit",
                enabled: true,
                action: "exitProgram",
              },
            ],
          },
          { key: "edit", text: "Edit", enabled: false },
          { key: "view", text: "View", enabled: false },
          { key: "help", text: "Help", enabled: false },
        ],
      },
      // --- End MenuBar Configuration ---
    },
  ),

  // Project Showcase Programs
  internet: createProgram(
    "internet",
    "My Projects",
    "desktop/internet.webp",
    "internet",
    {
      dimensions: { width: 1030, height: 780 },
      statusBarText: "Projects ready to explore",
      // --- Toolbar Configuration for My Projects ---
      toolbarConfig: {
        buttons: [
          {
            key: "back",
            enabled: false,
            icon: "./assets/gui/toolbar/back.webp",
            text: "Back",
            action: "navigateBack",
          },
          {
            key: "forward",
            enabled: false,
            icon: "./assets/gui/toolbar/forward.webp",
            text: null,
            action: "navigateForward",
          },
          {
            key: "home",
            enabled: true,
            icon: "./assets/gui/toolbar/home.webp",
            text: null,
            action: "navigateHome",
          },
          { type: "separator" },
          {
            key: "search",
            enabled: false,
            icon: "./assets/gui/toolbar/search.webp",
            text: "Search",
            action: "openSearch",
          },
          {
            key: "favourites",
            enabled: false,
            icon: "./assets/gui/toolbar/star.webp",
            text: "Favourites",
          },
          { type: "separator" },
          {
            key: "print",
            enabled: false,
            icon: "./assets/gui/toolbar/print.webp",
            text: "Print",
          },
        ],
      },
      // --- MenuBar Configuration for My Projects ---
      menuBarConfig: {
        items: [
          {
            key: "file",
            text: "File",
            enabled: true,
            dropdown: [
              { key: "new", text: "New", enabled: false, action: "fileNew" },
              {
                key: "open",
                text: "Open...",
                enabled: false,
                action: "fileOpen",
              },
              { key: "save", text: "Save", enabled: false, action: "fileSave" },
              {
                key: "saveAs",
                text: "Save As...",
                enabled: false,
                action: "fileSaveAs",
              },
              { type: "separator" },
              {
                key: "pageSetup",
                text: "Page Setup...",
                enabled: false,
                action: "pageSetup",
              },
              {
                key: "print",
                text: "Print...",
                enabled: false,
                action: "filePrint",
              },
              { type: "separator" },
              {
                key: "exit",
                text: "Exit",
                enabled: true,
                action: "exitProgram",
              },
            ],
          },
          { key: "edit", text: "Edit", enabled: false },
          { key: "view", text: "View", enabled: false },
          { key: "tools", text: "Tools", enabled: false },
          { key: "help", text: "Help", enabled: false },
        ],
      },
      // --- End MenuBar Configuration ---
    },
  ),

  // Special format entries with custom properties
};

export default programData;

// ==================================================
// END Program Registry
// ==================================================
