/**
 * @fileoverview Program Registry for the Windows XP simulation
 *
 * Defines configuration data for all available applications including window properties,
 * dimensions, icons, and content sources. This centralized registry ensures consistent
 * program initialization throughout the application.
 *
 * @module programRegistry
 */

import { isMobileDevice } from "./device.js";

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
 * Creates a program configuration with consistent properties
 *
 * @param {string} key - Unique program identifier
 * @param {string} title - Window title displayed in titlebar
 * @param {string} icon - Relative path to program icon
 * @param {Object} [extraProps={}] - Additional program-specific properties
 * @returns {Object} Complete program configuration object
 */
const createProgram = (key, title, icon, extraProps = {}) => ({
  id: makeId(key),
  title,
  icon: `./assets/gui/${icon}`,
  ...defaults.iframe,
  appPath: `placeholder.html?app=${key}`,
  ...extraProps,
});

// Shared dropdown templates
const VIEW_DROPDOWN = [
  { key: "close", text: "Close", enabled: true, action: "exitProgram" },
  { type: "separator" },
  { key: "maximize", text: "Maximize", enabled: !isMobileDevice(), action: "maximizeWindow" },
  { key: "minimize", text: "Minimize", enabled: true, action: "minimizeWindow" },
];

// Common File menu variant: Only Exit enabled
const FILE_DROPDOWN_EXIT_ONLY = [
  { key: "open", text: "Open...", enabled: false, action: "fileOpen" },
  { key: "saveAs", text: "Save as...", enabled: false, action: "fileSaveAs" },
  { type: "separator" },
  { key: "print", text: "Print", enabled: false, action: "filePrint" },
  { key: "pageSetup", text: "Print Setup", enabled: false, action: "pageSetup" },
  { type: "separator" },
  { key: "exit", text: "Exit", enabled: true, action: "exitProgram" },
];

// File menu for Notepad (New enabled)
const FILE_DROPDOWN_NOTEPAD = [
  { key: "new", text: "New", enabled: true, action: "fileNew" },
  { key: "open", text: "Open...", enabled: false, action: "fileOpen" },
  { key: "save", text: "Save", enabled: false, action: "fileSave" },
  { key: "saveAs", text: "Save As...", enabled: false, action: "fileSaveAs" },
  { type: "separator" },
  { key: "pageSetup", text: "Page Setup...", enabled: false, action: "pageSetup" },
  { key: "print", text: "Print...", enabled: false, action: "filePrint" },
  { type: "separator" },
  { key: "exit", text: "Exit", enabled: true, action: "exitProgram" },
];

// Custom File dropdown for Contact App
const FILE_DROPDOWN_CONTACT = [
  { key: "newMessage", text: "New Message", enabled: true, action: "newMessage" },
  { key: "sendMessage", text: "Send Message", enabled: true, action: "sendMessage" },
  { type: "separator" },
  { key: "print", text: "Print", enabled: false, action: "filePrint" },
  { key: "pageSetup", text: "Print Setup", enabled: false, action: "pageSetup" },
  { type: "separator" },
  { key: "exit", text: "Exit", enabled: true, action: "exitProgram" },
];

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
    {
      dimensions: { width: 750, height: 500 },
    },
  ),

  // System and Utility Programs
  info: createProgram("info", "Disclaimer", "start-menu/help.webp", {
    dimensions: { width: 390, height: 475 },
  }),
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
    statusBarText: "Getting to know the designer",
    appPath: "src/apps/about/about.html",
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
        },
        { type: "separator" },
        {
          key: "projects",
          enabled: true,
          icon: "./assets/gui/desktop/internet.webp",
          text: "My Projects",
          action: "openInternet",
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
        },
      ],
    },
    addressBarConfig: {
      enabled: true,
      icon: "./assets/gui/desktop/about.webp",
      title: "About Me",
      canNavigate: false
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
    statusBarText: "Reviewing professional background",
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
          key: "email",
          enabled: true,
          icon: "./assets/gui/desktop/contact.webp",
          text: "Contact Me",
          action: "openContact",
        },
        { type: "separator" },
        {
          key: "save",
          enabled: true,
          icon: "./assets/gui/toolbar/save.webp",
          text: "Download",
          action: "saveResume",
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
  internet: createProgram("internet", "My Projects", "desktop/internet.webp", {
    dimensions: { width: 900, height: 650 },
    statusBarText: "Exploring the portfolio",
    appPath: "src/apps/projects/projects.html",
    addressBarConfig: {
      enabled: true,
      icon: "./assets/gui/desktop/internet.webp",
      title: "https://www.myprojects.com",
      canNavigate: false
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
          key: "home",
          enabled: true,
          icon: "./assets/gui/toolbar/home.webp",
          text: "Home",
          action: "navigateHome",
        },
      ],
    },
  }),
  contact: createProgram("contact", "Contact Me", "desktop/contact.webp", {
    dimensions: { width: 600, height: 450 },
    statusBarText: "Let's start a conversation",
    appPath: "src/apps/contact/contact.html",
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
          text: "New Message",
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
