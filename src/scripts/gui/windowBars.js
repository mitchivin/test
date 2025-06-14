/*
 * windowBars.js — Window bar utilities for Windows XP simulation.
 * Provides functions to create menu bars, toolbars, address bars, and fetch social links for
 * application windows. Handles mobile/desktop differences and dynamic toolbar content.
 * @file src/scripts/gui/windowBars.js
 */

import { isMobileDevice } from "../utils/device.js";

// ===== Address Bar Utility =====
/**
 * Creates a Windows XP-style address bar component.
 * @param {Object} [options={}] - Options for the address bar.
 * @param {string} [options.icon] - Icon URL for the address bar.
 * @param {string} [options.title="About Me"] - Title text for the address bar.
 * @returns {HTMLElement} The address bar container element.
 */
export function createAddressBar({ icon, title = "About Me" } = {}) {
  const container = document.createElement("div");
  container.className = "addressbar-container";

  const icon_img_html = icon
    ? `<img style="margin: 0 3px 0 0" alt="icon" width="14" height="14" src="${icon}" />`
    : "";

  container.innerHTML = `
    <div class="addressbar-row">
      <div class="address-label-container">
        <span style="color: #7f7c73; font-size: 11px;">Address</span>
      </div>
      <div class="addressbar">
        <div style="display: flex; align-items: center;">
          ${icon_img_html}
          <span class="addressbar-title">${title}</span>
        </div>
        <img alt="dropdown" class="dropdownIcon" width="16" height="18" src="./assets/gui/toolbar/tooldropdown.webp" style="filter: grayscale(100%); opacity: 0.6;" />
      </div>
      <div class="go-button-container">
        <img alt="go" class="goIcon" width="20" height="20" src="./assets/gui/toolbar/go.webp" style="filter: grayscale(100%); opacity: 0.6;" />
        <span>Go</span>
      </div>
    </div>
  `;
  return container;
}

// Add a cache for socials
let SOCIALS_CACHE = null; // Caches the fetched social media links to avoid redundant API calls.

/**
 * Asynchronously fetches and caches social media links from `info.json`.
 * If the cache is populated, it returns the cached data. Otherwise, it fetches,
 * caches, and then returns the social links. Returns an empty array on fetch error.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of social objects.
 */
async function getSocials() {
  if (SOCIALS_CACHE) return SOCIALS_CACHE;
  try {
    // Use relative path for info.json to work on GitHub Pages and local
    const response = await fetch("info.json");
    const info = await response.json();
    SOCIALS_CACHE = Array.isArray(info.socials) ? info.socials : [];
    return SOCIALS_CACHE;
  } catch (_e) {
    SOCIALS_CACHE = [];
    return SOCIALS_CACHE;
  }
}

// --- MenuBar Creation ---
/**
 * Creates a menu bar for a window, including its items and dropdowns.
 * Handles special cases for certain windows (e.g., Resume app's File menu)
 * and manages the active state of dropdown menus.
 * @param {Object} menuBarConfig - Configuration for the menu bar, expecting an `items` array.
 * @param {string} windowId - The unique ID of the window this menu bar belongs to.
 * @param {HTMLElement} parentWindowElement - The parent window DOM element.
 * @returns {HTMLElement|null} The menu bar container element, or null if `menuBarConfig` or `menuBarConfig.items` is falsy.
 */
export function createMenuBar(menuBarConfig, windowId, parentWindowElement) {
  if (!menuBarConfig || !menuBarConfig.items) return null;
  const menuBarContainer = document.createElement("div");
  menuBarContainer.className = "menu-bar-container";
  let _parentWindowElement = parentWindowElement;
  let _closeActiveMenu = null;
  menuBarContainer.setParentWindowElement = function (newParent) {
    if (_parentWindowElement && _closeActiveMenu) {
      _parentWindowElement.removeEventListener(
        "window-drag-start",
        _closeActiveMenu,
      );
      _parentWindowElement.removeEventListener(
        "request-close-window",
        _closeActiveMenu,
      );
    }
    _parentWindowElement = newParent;
    if (_parentWindowElement && _closeActiveMenu) {
      _parentWindowElement.addEventListener(
        "window-drag-start",
        _closeActiveMenu,
      );
      _parentWindowElement.addEventListener(
        "request-close-window",
        _closeActiveMenu,
      );
    }
  };
  const menuBar = document.createElement("div");
  menuBar.className = "menu-bar";
  menuBarConfig.items.forEach((itemConfig) => {
    // Special handling for Resume app's File menu
    if (
      windowId === "resume-window" &&
      itemConfig.key === "file" &&
      Array.isArray(itemConfig.dropdown)
    ) {
      // Remove Print Setup (action: 'pageSetup')
      itemConfig.dropdown = itemConfig.dropdown.filter(
        (opt) => opt.action !== "pageSetup",
      );
      // Prevent duplicate Download option
      if (!itemConfig.dropdown.some((opt) => opt.action === "saveResume")) {
        // Insert Download above Print (action: 'filePrint')
        const printIdx = itemConfig.dropdown.findIndex(
          (opt) => opt.action === "filePrint",
        );
        if (printIdx !== -1) {
          itemConfig.dropdown.splice(printIdx, 0, {
            text: "Download",
            action: "saveResume",
            enabled: true,
          });
        } else {
          // If Print not found, just add Download at the end
          itemConfig.dropdown.push({
            text: "Download",
            action: "saveResume",
            enabled: true,
          });
        }
      }
    }
    const menuItemDiv = document.createElement("div");
    menuItemDiv.className = `menu-item${!itemConfig.enabled ? " disabled" : ""}`;
    menuItemDiv.textContent = itemConfig.text;
    menuItemDiv.setAttribute("data-menu", itemConfig.key);
    menuBar.appendChild(menuItemDiv);
    if (
      itemConfig.dropdown &&
      itemConfig.dropdown.length > 0 &&
      !["edit", "tools", "help"].includes(itemConfig.key)
    ) {
      const dropdownMenu = document.createElement("div");
      dropdownMenu.id = `${itemConfig.key}-menu-${windowId}`;
      dropdownMenu.className = "dropdown-menu";
      itemConfig.dropdown.forEach((optionConfig) => {
        if (optionConfig.type === "separator") {
          const separator = document.createElement("div");
          separator.className = "menu-separator";
          dropdownMenu.appendChild(separator);
        } else {
          const menuOptionDiv = document.createElement("div");
          menuOptionDiv.className = `menu-option${!optionConfig.enabled ? " disabled" : ""}`;
          menuOptionDiv.textContent = optionConfig.text;
          if (optionConfig.action) {
            menuOptionDiv.setAttribute("data-action", optionConfig.action);
          }
          dropdownMenu.appendChild(menuOptionDiv);
        }
      });
      menuBarContainer.appendChild(dropdownMenu);
    }
  });
  // Add logo placeholder (now an image)
  const logoPlaceholder = document.createElement("img");
  logoPlaceholder.className = "menu-bar-logo-placeholder";
  logoPlaceholder.src = "./assets/gui/toolbar/barlogo.webp";
  logoPlaceholder.alt = "Logo";
  menuBar.appendChild(logoPlaceholder);
  menuBarContainer.insertBefore(menuBar, menuBarContainer.firstChild);

  // --- MenuBar JS Logic ---
  setTimeout(() => {
    let activeMenu = null;
    const dropdownMenus = {};
    menuBarContainer.querySelectorAll(".dropdown-menu").forEach((menu) => {
      const menuKey = menu.id.split("-")[0];
      dropdownMenus[menuKey] = menu;
    });
    function closeActiveMenu() {
      if (activeMenu) {
        const menuName = activeMenu.getAttribute("data-menu");
        const menu = dropdownMenus[menuName];
        if (menu) menu.classList.remove("show");
        activeMenu.classList.remove("active");
        activeMenu = null;
      }
    }
    _closeActiveMenu = closeActiveMenu;
    // Drag-to-close
    if (_parentWindowElement) {
      _parentWindowElement.addEventListener(
        "window-drag-start",
        closeActiveMenu,
      );
      _parentWindowElement.addEventListener(
        "request-close-window",
        closeActiveMenu,
      );
      // New: Close menu on iframe interaction (focus/click)
      _parentWindowElement.addEventListener(
        "iframe-interaction",
        closeActiveMenu,
      );
    }
    // Menu item click
    const menuItems = menuBarContainer.querySelectorAll(
      ".menu-bar .menu-item:not(.disabled)",
    );
    menuItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const menuName = item.getAttribute("data-menu");
        const menu = dropdownMenus[menuName];
        if (!menu) return;
        if (activeMenu === item) {
          closeActiveMenu();
          return;
        }
        closeActiveMenu();
        // --- DYNAMIC MAXIMIZE/RESTORE LABEL FOR VIEW MENU ---
        if (menuName === "view" && _parentWindowElement) {
          const maximizeOption = menu.querySelector(
            '[data-action="maximizeWindow"]',
          );
          if (maximizeOption) {
            const isMaximized =
              _parentWindowElement.classList.contains("maximized");
            maximizeOption.textContent = isMaximized ? "Restore" : "Maximize";
            maximizeOption.setAttribute(
              "aria-label",
              isMaximized ? "Restore" : "Maximize",
            );
          }
        }
        item.classList.add("active");
        const menuBarRect = item.closest(".menu-bar").getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        menu.style.position = "fixed";
        menu.style.left = itemRect.left + "px";
        menu.style.top = menuBarRect.bottom + "px";
        menu.style.minWidth = "130px";
        menu.classList.add("show");
        activeMenu = item;
      });
    });
    // Outside click
    const outsideClickListener = (event) => {
      if (activeMenu && !menuBarContainer.contains(event.target)) {
        closeActiveMenu();
      }
    };
    setTimeout(
      () => document.addEventListener("click", outsideClickListener),
      0,
    );
    // Menu option click
    const menuOptions = menuBarContainer.querySelectorAll(
      ".dropdown-menu .menu-option:not(.disabled)",
    );
    menuOptions.forEach((option) => {
      const newOption = option.cloneNode(true);
      option.replaceWith(newOption);
      newOption.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        const action = newOption.getAttribute("data-action");
        let win = _parentWindowElement;

        // Check the flag before dispatching menu action
        if (win && win.dataset.acceptInput === "false") {
          // console.log("[windowBars] Menu option: Input not accepted yet.");
          closeActiveMenu(); // Still close the dropdown itself
          return; // Ignore action if input is not yet accepted
        }

        if (action && win) {
          const performAction = () => {
            if (action === "exitProgram") {
              win.dispatchEvent(
                new CustomEvent("request-close-window", { bubbles: false }),
              );
            } else if (action === "minimizeWindow") {
              win.dispatchEvent(
                new CustomEvent("request-minimize-window", { bubbles: false }),
              );
            } else if (action === "maximizeWindow") {
              win.dispatchEvent(
                new CustomEvent("request-maximize-window", { bubbles: false }),
              );
            } else if (
              action.startsWith("file") ||
              action.startsWith("edit") ||
              action.startsWith("view") ||
              action.startsWith("tools") ||
              action.startsWith("help") ||
              action === "saveResume" ||
              action === "newMessage" ||
              action === "sendMessage"
            ) {
              win.dispatchEvent(
                new CustomEvent("dispatchToolbarAction", {
                  detail: { action: action, button: null },
                  bubbles: false,
                }),
              );
            }
          };

          performAction();
        }
        closeActiveMenu();
      });
    });
  }, 0);

  // Listen for the custom iframe-interaction event
  // This part seems to be missing its actual attachment to an element or is incomplete
  // if (_parentWindowElement) { // This check might be needed depending on where this code snippet fits
  //   _parentWindowElement.addEventListener("iframe-interaction", () => {
  //     if (activeMenu) {
  //         closeActiveMenu();
  //     }
  //   });
  // }

  return menuBarContainer;
}

// --- Toolbar Creation ---
/**
 * Creates a toolbar for a window, adapting its content based on the device type (mobile/desktop)
 * and specific window context (e.g., Projects, Contact Me).
 * Handles dynamic button filtering, ordering, and special behaviors like the mobile close/home button.
 * @param {Object} toolbarConfig - Configuration for the toolbar, expecting a `buttons` array.
 * @param {string} windowId - The unique ID of the window this toolbar belongs to.
 * @param {boolean} [isBottom=false] - Indicates if the toolbar is a bottom toolbar.
 * @returns {HTMLElement|null} The toolbar wrapper element, or null if `toolbarConfig` or `toolbarConfig.buttons` is falsy.
 */
export function createToolbar(toolbarConfig, windowId, isBottom) {
  if (!toolbarConfig || !toolbarConfig.buttons) return null;
  const toolbarWrapper = document.createElement("div");
  toolbarWrapper.className = "toolbar-container";
  const toolbarRow = document.createElement("div");
  toolbarRow.className = "toolbar-row";
  if (isBottom) toolbarRow.classList.add("toolbar-bottom");
  const isMobile = isMobileDevice();
  let buttons = toolbarConfig.buttons;

  // For "projects-window", the "view-description" button is mobile-only.
  if (windowId === "projects-window" && !isMobile) {
    buttons = buttons.filter(
      (btnConfig) => btnConfig.key !== "view-description",
    );
  }

  // On mobile, for Contact Me only, filter out disabled buttons
  if (isMobile && windowId === "contact-window") {
    // Remove disabled buttons
    buttons = buttons.filter(
      (btn) => btn.enabled !== false || btn.type === "separator",
    );

    // Specifically keep only 'New Message' and 'Send Message' for mobile contact,
    // and ensure no separators between/after them. User wants Send then New on mobile.
    const newButton = buttons.find((btn) => btn.key === "new");
    const sendButton = buttons.find((btn) => btn.key === "send");

    const mobileContactButtons = [];
    if (sendButton) mobileContactButtons.push(sendButton); // Send Message first
    if (newButton) mobileContactButtons.push(newButton); // New Message second

    buttons = mobileContactButtons; // This replaces the original buttons array.

    // The old logic for removing Instagram/LinkedIn and specific separators is no longer needed
    // as we are explicitly rebuilding the button list.
  }

  // On mobile, for About Me only, filter out disabled buttons and remove the separator to the right of My Resume
  if (isMobile && windowId === "about-window") {
    buttons = buttons.filter(
      (btn) => btn.enabled !== false || btn.type === "separator",
    );
    // Remove all separators before and after My Projects and My Resume
    const projectsIdx = buttons.findIndex((btn) => btn.key === "projects");
    let resumeIdx = buttons.findIndex((btn) => btn.key === "resume");
    // Remove separator before My Resume if present
    if (resumeIdx > 0 && buttons[resumeIdx - 1].type === "separator") {
      buttons.splice(resumeIdx - 1, 1);
      // Adjust indices after removal
      if (projectsIdx < resumeIdx) resumeIdx--;
    }
    // Remove separator after My Resume if present
    if (buttons[resumeIdx + 1] && buttons[resumeIdx + 1].type === "separator") {
      buttons.splice(resumeIdx + 1, 1);
    }
    // Ensure separator exists between Projects and Resume
    if (
      projectsIdx !== -1 &&
      resumeIdx !== -1 &&
      resumeIdx - projectsIdx === 1
    ) {
      buttons.splice(resumeIdx, 0, { type: "separator" });
    }
  }

  // On mobile, for My Projects only, remove the separator to the right of view-description
  if (isMobile && windowId === "projects-window") {
    const viewDescIdx = buttons.findIndex(
      (btn) => btn.key === "view-description",
    );
    if (
      viewDescIdx !== -1 &&
      buttons[viewDescIdx + 1] &&
      buttons[viewDescIdx + 1].type === "separator"
    ) {
      buttons.splice(viewDescIdx + 1, 1);
    }
  }

  // --- Add close button as first item on mobile only ---
  let mobileCloseBtn = null;
  if (isMobile) {
    mobileCloseBtn = document.createElement("div");
    mobileCloseBtn.className = "toolbar-button toolbar-close-button";
    mobileCloseBtn.setAttribute("aria-label", "Close");
    mobileCloseBtn.innerHTML = `<img alt="close" width="25" height="25" src="assets/gui/toolbar/delete.webp" /><span>Close</span>`;
    mobileCloseBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      // Find the parent window element
      let parentWindowElement = toolbarWrapper.parentElement;
      while (
        parentWindowElement &&
        !parentWindowElement.classList.contains("app-window")
      ) {
        parentWindowElement = parentWindowElement.parentElement;
      }

      // Check the flag before dispatching close event
      if (
        parentWindowElement &&
        parentWindowElement.dataset.acceptInput === "false"
      ) {
        // console.log("[windowBars] Mobile close button: Input not accepted yet.");
        return; // Ignore click if input is not yet accepted
      }

      if (parentWindowElement) {
        parentWindowElement.dispatchEvent(
          new CustomEvent("request-close-window", { bubbles: false }),
        );
      }
    });
    toolbarRow.appendChild(mobileCloseBtn);
  }

  // Render all toolbar buttons in order (with dividers for desktop)
  buttons.forEach((buttonConfig) => {
    // Handle socials placeholder
    if (buttonConfig.type === "socials") {
      (async () => {
        let socials = await getSocials();
        // If this is the Contact Me app, filter and order socials
        if (windowId === "contact-window") {
          // Only keep LinkedIn for Contact Me toolbar
          socials = socials.filter((s) => s.key === "linkedin");
        }
        socials.forEach((social) => {
          const socialBtn = document.createElement("div");
          socialBtn.className = `toolbar-button social ${social.key}`;
          socialBtn.setAttribute("data-action", "openExternalLink");
          socialBtn.setAttribute("data-url-to-open", social.url);
          socialBtn.setAttribute("title", `View on ${social.name}`);
          socialBtn.setAttribute("aria-label", `View on ${social.name}`);
          socialBtn.setAttribute("data-social-key", social.key);
          // For Contact Me toolbar, show both icon and text for LinkedIn
          if (
            windowId === "contact-window" &&
            social.key === "linkedin" &&
            !isMobile
          ) {
            socialBtn.innerHTML = `<img alt="${social.name}" width="25" height="25" src="${social.icon}" /><span>LinkedIn</span>`;
          } else {
            socialBtn.innerHTML = `<img alt="${social.name}" width="25" height="25" src="${social.icon}" />`;
          }
          socialBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            window.open(social.url, "_blank");
          });
          toolbarRow.appendChild(socialBtn);
        });
      })();
      return;
    }
    // On mobile, skip the Home button in the My Projects window
    if (
      isMobile &&
      windowId === "projects-window" &&
      buttonConfig.key === "home"
    )
      return;

    // Skip buttons marked as desktopOnly if on mobile
    if (isMobile && buttonConfig.desktopOnly) {
      return;
    }

    // --- Desktop: Render separator as a vertical line ---
    if (buttonConfig.type === "separator") {
      const divider = document.createElement("div");
      divider.className = "vertical_line";
      toolbarRow.appendChild(divider);
      return;
    }

    if (buttonConfig.key) {
      const buttonDiv = document.createElement("div");
      buttonDiv.className = `toolbar-button ${buttonConfig.key}`;
      if (!buttonConfig.enabled) buttonDiv.classList.add("disabled");
      if (buttonConfig.key === "home" && windowId === "projects-window") {
        buttonDiv.setAttribute("data-action", "home");
      } else if (buttonConfig.action) {
        buttonDiv.setAttribute("data-action", buttonConfig.action);
      }
      let buttonContent = "";
      if (buttonConfig.icon) {
        buttonContent += `<img alt="${buttonConfig.key}" width="25" height="25" src="${buttonConfig.icon}" />`;
      }
      if (buttonConfig.text) {
        // Ensure "New Message" text is used directly from config for all views (previously shortened for mobile)
        buttonContent += `<span>${buttonConfig.text}</span>`;
      }
      buttonDiv.innerHTML = buttonContent;
      if (buttonConfig.style) {
        buttonDiv.setAttribute("style", buttonConfig.style);
      }
      // Add data-url-to-open if the button config has a URL
      if (buttonConfig.url) {
        buttonDiv.dataset.urlToOpen = buttonConfig.url;
      }
      toolbarRow.appendChild(buttonDiv);
    }
  });

  toolbarWrapper.appendChild(toolbarRow);

  // --- Mobile: Listen for lightbox-state messages to toggle close/home button ---
  if (isMobile && windowId === "projects-window" && mobileCloseBtn) {
    let isHomeMode = false; // Tracks if the mobile button should act as 'Home' (true) or 'Close' (false).
    function setToHomeMode() {
      isHomeMode = true;
      mobileCloseBtn.innerHTML = `<img alt="home" width="25" height="25" src="assets/gui/toolbar/home.webp" /><span>Home</span>`;
      mobileCloseBtn.setAttribute("aria-label", "Home");
    }
    function setToCloseMode() {
      isHomeMode = false;
      mobileCloseBtn.innerHTML = `<img alt="close" width="25" height="25" src="assets/gui/toolbar/delete.webp" /><span>Close</span>`;
      mobileCloseBtn.setAttribute("aria-label", "Close");
    }
    // Initial mode is close
    setToCloseMode();
    // Remove all previous click listeners
    mobileCloseBtn.replaceWith(mobileCloseBtn.cloneNode(true));
    // Re-attach reference
    mobileCloseBtn = toolbarRow.querySelector(".toolbar-close-button");
    // Attach a single click handler that checks mode
    mobileCloseBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (isHomeMode) {
        // Only close the lightbox (send home to iframe)
        let parent = toolbarWrapper.parentElement;
        while (parent && !parent.classList.contains("app-window")) {
          parent = parent.parentElement;
        }
        if (parent) {
          const iframe = parent.querySelector("iframe");
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(
              { type: "toolbar-action", action: "home" },
              "*",
            );
          }
        }
      } else {
        // Close the window
        let parent = toolbarWrapper.parentElement;
        while (parent && !parent.classList.contains("app-window")) {
          parent = parent.parentElement;
        }
        if (parent) {
          parent.dispatchEvent(
            new CustomEvent("request-close-window", { bubbles: false }),
          );
        }
      }
    });
    window.addEventListener("message", function (event) {
      if (event.data && event.data.type === "lightbox-state") {
        if (event.data.open) {
          setToHomeMode();
        } else {
          setToCloseMode();
          // Force reflow/update if needed
          if (mobileCloseBtn) {
            mobileCloseBtn.offsetWidth;
          }
        }
      }
    });
  }

  return toolbarWrapper;
}

// Add this at the end of the file to ensure all toolbar buttons get the correct pressed-in effect on both desktop and mobile
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".toolbar-button").forEach((btn) => {
      btn.addEventListener("pointerdown", function () {
        btn.classList.add("touch-active");
      });
      btn.addEventListener("pointerup", function () {
        btn.classList.remove("touch-active");
      });
      btn.addEventListener("pointerleave", function () {
        btn.classList.remove("touch-active");
      });
      btn.addEventListener("pointercancel", function () {
        btn.classList.remove("touch-active");
      });
    });
  });
}

export { getSocials };
