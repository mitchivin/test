// windowBars.js
// Handles creation and initialization of menubar and toolbar for windows in the XP simulation

import { isMobileDevice } from "../utils/device.js";

/**
 * @fileoverview Handles creation and initialization of menubar and toolbar for windows in the XP simulation.
 * Provides AddressBar, MenuBar, and Toolbar creation utilities.
 */

// AddressBar - Standalone Address Bar for XP Simulation
/**
 * Creates a Windows XP-style address bar component.
 * @param {Object} options - Options for the address bar.
 * @param {string} [options.icon] - Icon URL for the address bar.
 * @param {string} [options.title] - Title text for the address bar.
 * @returns {HTMLElement} The address bar container element.
 */
export function createAddressBar({
  icon = "./assets/gui/toolbar/aboutme.webp",
  title = "About Me",
} = {}) {
  // Create container
  const container = document.createElement("div");
  container.className = "addressbar-container";

  // Address bar row
  container.innerHTML = `
    <div class="addressbar-row">
      <div class="address-label-container">
        <span style="color: #7f7c73; font-size: 11px;">Address</span>
      </div>
      <div class="addressbar">
        <div style="display: flex; align-items: center;">
          <img style="margin: 0 3px 0 0" alt="icon" width="14" height="14" src="${icon}" />
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

// --- CSS Injection Helpers ---

// --- MenuBar Creation ---
export function createMenuBar(menuBarConfig, windowId, parentWindowElement) {
  if (!menuBarConfig || !menuBarConfig.items) return null;
  const menuBarContainer = document.createElement("div");
  menuBarContainer.className = "menu-bar-container";
  let _parentWindowElement = parentWindowElement;
  let _closeActiveMenu = null;
  menuBarContainer.setParentWindowElement = function (newParent) {
    // Remove old listeners if any
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
  // Build menu items
  menuBarConfig.items.forEach((itemConfig) => {
    const menuItemDiv = document.createElement("div");
    menuItemDiv.className = `menu-item${!itemConfig.enabled ? " disabled" : ""}`;
    menuItemDiv.textContent = itemConfig.text;
    menuItemDiv.setAttribute("data-menu", itemConfig.key);
    menuBar.appendChild(menuItemDiv);
    // Dropdown
    if (itemConfig.dropdown && itemConfig.dropdown.length > 0) {
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
          const maximizeOption = menu.querySelector('[data-action="maximizeWindow"]');
          if (maximizeOption) {
            const isMaximized = _parentWindowElement.classList.contains("maximized");
            maximizeOption.textContent = isMaximized ? "Restore" : "Maximize";
            maximizeOption.setAttribute("aria-label", isMaximized ? "Restore" : "Maximize");
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
      option.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = option.getAttribute("data-action");
        if (action) {
          if (action === "exitProgram" && _parentWindowElement) {
            _parentWindowElement.dispatchEvent(
              new CustomEvent("request-close-window", { bubbles: false }),
            );
          } else if (action === "minimizeWindow" && _parentWindowElement) {
            _parentWindowElement.dispatchEvent(
              new CustomEvent("request-minimize-window", { bubbles: false }),
            );
          } else if (action === "maximizeWindow" && _parentWindowElement) {
            _parentWindowElement.dispatchEvent(
              new CustomEvent("request-maximize-window", { bubbles: false }),
            );
          }
        }
        closeActiveMenu();
      });
    });
  }, 0);
  return menuBarContainer;
}

// --- Toolbar Creation ---
export function createToolbar(toolbarConfig, windowId, isBottom) {
  if (!toolbarConfig || !toolbarConfig.buttons) return null;
  const toolbarWrapper = document.createElement("div");
  toolbarWrapper.className = "toolbar-container";
  const toolbarRow = document.createElement("div");
  toolbarRow.className = "toolbar-row";
  if (isBottom) toolbarRow.classList.add("toolbar-bottom");
  const isMobile = isMobileDevice && isMobileDevice();
  let buttons = toolbarConfig.buttons;
  if (isMobile && windowId === "resume-window") {
    buttons = buttons.filter(
      (btn) => !["actual-size", "zoom-in", "zoom-out"].includes(btn.key),
    );
  }
  buttons.forEach((buttonConfig) => {
    // On mobile, skip dividers except for internet window (My Projects)
    if (
      isMobile &&
      buttonConfig.type === "separator" &&
      windowId !== "internet-window"
    )
      return; // Skip dividers on mobile except My Projects
    // On mobile, skip disabled buttons except for back in internet window
    if (
      isMobile &&
      !buttonConfig.enabled &&
      !(
        (windowId === "internet-window" && buttonConfig.key === "back") ||
        (windowId === "internet-window" && buttonConfig.key === "home")
      )
    )
      return;
    // On mobile, skip forward button in internet window
    if (
      isMobile &&
      windowId === "internet-window" &&
      buttonConfig.key === "forward"
    )
      return;
    if (buttonConfig.type === "separator") {
      const separator = document.createElement("div");
      separator.className = "vertical_line";
      toolbarRow.appendChild(separator);
    } else if (buttonConfig.key) {
      if (
        isMobile &&
        !buttonConfig.enabled &&
        !(
          windowId === "internet-window" &&
          (buttonConfig.key === "back" || buttonConfig.key === "forward" || buttonConfig.key === "home")
        )
      )
        return;
      // Add 'Home' text to home button on mobile
      if (isMobile && buttonConfig.key === "home") {
        buttonConfig.text = "Home";
      }
      // In About Me window on mobile, replace 'photos' and 'videos' buttons with new ones using correct icons and actions
      if (isMobile && windowId === "about-window") {
        if (buttonConfig.key === "photos") {
          buttonConfig = {
            key: "projects",
            enabled: true,
            icon: "./assets/gui/desktop/internet.webp", // My Projects icon
            text: "My Projects",
            action: "openProjects",
          };
        } else if (buttonConfig.key === "videos") {
          buttonConfig = {
            key: "resume",
            enabled: true,
            icon: "./assets/gui/desktop/resume.webp", // My Resume icon
            text: "My Resume",
            action: "openResume",
          };
        }
      }
      // Rename save button to Download everywhere
      if (buttonConfig.key === "save") {
        buttonConfig.text = "Download";
      }
      // Use Contact Me program icon for the contact button
      if (buttonConfig.key === "email") {
        buttonConfig.icon = "./assets/gui/desktop/contact.webp";
      }
      const buttonDiv = document.createElement("div");
      buttonDiv.className = `toolbar-button ${buttonConfig.key}`;
      if (!buttonConfig.enabled) buttonDiv.classList.add("disabled");
      // Always set data-action for home button in internet-window
      if (buttonConfig.key === "home" && windowId === "internet-window") {
        buttonDiv.setAttribute("data-action", "navigateHome");
      } else if (buttonConfig.action) {
        buttonDiv.setAttribute("data-action", buttonConfig.action);
      }
      let buttonContent = "";
      if (buttonConfig.icon) {
        buttonContent += `<img alt="${buttonConfig.key}" width="25" height="25" src="${buttonConfig.icon}" />`;
      }
      if (buttonConfig.text) {
        buttonContent += `<span>${buttonConfig.text}</span>`;
      }
      buttonDiv.innerHTML = buttonContent;
      toolbarRow.appendChild(buttonDiv);
    }
  });
  // --- Add divider and close button on mobile only ---
  if (isMobile) {
    // Close button (match other toolbar buttons)
    const closeBtn = document.createElement("div");
    closeBtn.className = "toolbar-button toolbar-close-button";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = `<img alt=\"close\" width=\"25\" height=\"25\" src=\"assets/gui/toolbar/delete.webp\" /><span>Close</span>`;
    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      // Find the parent window element and dispatch the close event
      let parent = toolbarWrapper.parentElement;
      while (parent && !parent.classList.contains("app-window")) {
        parent = parent.parentElement;
      }
      if (parent) {
        parent.dispatchEvent(
          new CustomEvent("request-close-window", { bubbles: false }),
        );
      }
    });
    // Add the close button as the first item on the left for mobile
    toolbarRow.insertBefore(closeBtn, toolbarRow.firstChild);

    // Insert divider after the first group of buttons (left group)
    const firstDivider = document.createElement("div");
    firstDivider.className = "vertical_line";
    // Find the first non-disabled, non-separator button after the left group
    // For simplicity, insert after the first group (before the first separator or after the last left button)
    // We'll insert after the first group of buttons (before the first separator or at index 2)
    const toolbarButtons = Array.from(toolbarRow.children).filter((el) =>
      el.classList.contains("toolbar-button"),
    );
    if (toolbarButtons.length > 0) {
      // Insert after the first group (after the first button)
      toolbarRow.insertBefore(
        firstDivider,
        toolbarButtons[1] || toolbarRow.children[0].nextSibling,
      );
    }
  }
  if (isMobile && windowId === "internet-window") {
    // Find the forward button
    const forwardBtn = toolbarRow.querySelector(".toolbar-button.forward");
    const homeBtn = toolbarRow.querySelector(".toolbar-button.home");
    if (forwardBtn && homeBtn) {
      const divider = document.createElement("div");
      divider.className = "vertical_line";
      toolbarRow.insertBefore(divider, homeBtn);
    }
  }
  toolbarWrapper.appendChild(toolbarRow);
  return toolbarWrapper;
}
