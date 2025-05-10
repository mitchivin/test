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

  // On mobile, for Contact Me only, filter out disabled buttons
  if (isMobile && windowId === 'contact-window') {
    // Remove disabled buttons
    buttons = buttons.filter(btn => btn.enabled !== false || btn.type === 'separator');
    // Remove the separator immediately after New Message
    const newMsgIdx = buttons.findIndex(btn => btn.key === 'new');
    if (newMsgIdx !== -1 && buttons[newMsgIdx + 1] && buttons[newMsgIdx + 1].type === 'separator') {
      buttons.splice(newMsgIdx + 1, 1);
    }
  }

  // --- Add close button as first item on mobile only ---
  let mobileCloseBtn = null;
  if (isMobile) {
    mobileCloseBtn = document.createElement("div");
    mobileCloseBtn.className = "toolbar-button toolbar-close-button";
    mobileCloseBtn.setAttribute("aria-label", "Close");
    mobileCloseBtn.innerHTML = `<img alt=\"close\" width=\"25\" height=\"25\" src=\"assets/gui/toolbar/delete.webp\" /><span>Close</span>`;
    mobileCloseBtn.addEventListener("click", function (e) {
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
    toolbarRow.appendChild(mobileCloseBtn);
    // Add divider after close button
    const firstDivider = document.createElement("div");
    firstDivider.className = "vertical_line";
    toolbarRow.appendChild(firstDivider);
  }

  // Render all toolbar buttons and dividers in order
  buttons.forEach((buttonConfig) => {
    // On mobile, skip the Home button in the My Projects window
    if (isMobile && windowId === "internet-window" && buttonConfig.key === "home") return;

    // Skip 'view-description' button on desktop for 'internet-window'
    if (!isMobile && windowId === "internet-window" && buttonConfig.key === "view-description") {
        return; 
    }

    // Skip buttons marked as desktopOnly if on mobile
    if (isMobile && buttonConfig.desktopOnly) {
        return;
    }

    if (buttonConfig.type === "separator") {
      const separator = document.createElement("div");
      separator.className = "vertical_line";
      toolbarRow.appendChild(separator);
    } else if (buttonConfig.key) {
      const buttonDiv = document.createElement("div");
      buttonDiv.className = `toolbar-button ${buttonConfig.key}`;
      if (!buttonConfig.enabled) buttonDiv.classList.add("disabled");
      if (buttonConfig.key === "home" && windowId === "internet-window") {
        buttonDiv.setAttribute("data-action", "navigateHome");
      } else if (buttonConfig.action) {
        buttonDiv.setAttribute("data-action", buttonConfig.action);
      }
      let buttonContent = "";
      if (buttonConfig.icon) {
        buttonContent += `<img alt=\"${buttonConfig.key}\" width=\"25\" height=\"25\" src=\"${buttonConfig.icon}\" />`;
      }
      if (buttonConfig.text) {
        buttonContent += `<span>${buttonConfig.text}</span>`;
      }
      buttonDiv.innerHTML = buttonContent;
      toolbarRow.appendChild(buttonDiv);
    }
  });

  toolbarWrapper.appendChild(toolbarRow);

  // --- Mobile: Listen for lightbox-state messages to toggle close/home button ---
  if (isMobile && windowId === "internet-window" && mobileCloseBtn) {
    let isHomeMode = false;
    function setToHomeMode() {
      isHomeMode = true;
      mobileCloseBtn.innerHTML = `<img alt=\"home\" width=\"25\" height=\"25\" src=\"assets/gui/toolbar/home.webp\" /><span>Home</span>`;
      mobileCloseBtn.setAttribute('aria-label', 'Home');
    }
    function setToCloseMode() {
      isHomeMode = false;
      mobileCloseBtn.innerHTML = `<img alt=\"close\" width=\"25\" height=\"25\" src=\"assets/gui/toolbar/delete.webp\" /><span>Close</span>`;
      mobileCloseBtn.setAttribute('aria-label', 'Close');
    }
    // Initial mode is close
    setToCloseMode();
    // Remove all previous click listeners
    mobileCloseBtn.replaceWith(mobileCloseBtn.cloneNode(true));
    // Re-attach reference
    mobileCloseBtn = toolbarRow.querySelector('.toolbar-close-button');
    // Attach a single click handler that checks mode
    mobileCloseBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (isHomeMode) {
        // Only close the lightbox (send navigateHome to iframe)
        let parent = toolbarWrapper.parentElement;
        while (parent && !parent.classList.contains("app-window")) {
          parent = parent.parentElement;
        }
        if (parent) {
          const iframe = parent.querySelector('iframe');
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'toolbar-action', action: 'navigateHome' }, '*');
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
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'lightbox-state') {
        if (event.data.open) {
          setToHomeMode();
        } else {
          setToCloseMode();
        }
      }
    });
  }

  return toolbarWrapper;
}
