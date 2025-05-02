// windowBars.js
// Handles creation and initialization of menubar and toolbar for windows in the XP simulation

import { isMobileDevice } from "../utils/device.js";

// --- CSS Injection Helpers ---
function injectMenuBarCSS() {
  if (document.getElementById("xp-menubar-css")) return;
  const style = document.createElement("style");
  style.id = "xp-menubar-css";
  style.textContent = `
.window-body.iframe-container .menu-bar {
  display: flex;
  align-items: center;
  background: #ece9d8;
  height: 22px;
  min-height: 22px;
  max-height: 22px;
  box-sizing: border-box;
  flex-shrink: 0;
  flex-grow: 0;
  overflow: hidden;
  padding: 0 8px 0 0;
  font-family: Tahoma, Arial, sans-serif;
  font-size: 11px;
  user-select: none;
  position: relative;
  z-index: 30;
  border-bottom: 2px solid #d7d4ca;
  cursor: default;
}
.window-body.iframe-container .menu-bar .menu-item {
  flex: 1 1 0;
  text-align: center;
  max-width: fit-content;
  padding: 0 12px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.window-body.iframe-container .menu-item:not(.disabled):hover,
.window-body.iframe-container .menu-item.active {
  background: #0a6fc2;
  color: #fff;
}
.window-body.iframe-container .menu-item.disabled {
  color: #bcbcbc;
  cursor: default;
}
.window-body.iframe-container .menu-item.disabled:hover {
    background: none;
    color: #bcbcbc;
    border: none;
    outline: none;
    box-shadow: none;
}
.window-body.iframe-container .dropdown-menu {
  display: none;
  position: absolute;
  left: 0;
  top: 100%;
  width: 130px;
  background: #ece9d8;
  border: 1px solid #b5b2a3;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  font-size: 11px;
  font-family: Tahoma, Arial, sans-serif;
  z-index: 1000;
  margin-top: 1px;
  border-radius: 0;
  padding: 0;
  box-sizing: border-box;
}
.window-body.iframe-container .dropdown-menu.show {
  display: block;
}
.window-body.iframe-container .menu-option {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 2px 10px 2px 24px;
  cursor: default;
  white-space: nowrap;
  font-family: inherit;
  font-size: inherit;
  border: none;
  background: none;
  text-align: left;
  transition: background 0.13s;
}
.window-body.iframe-container .menu-option:hover:not(.disabled) {
  background: #0a6fc2;
  color: #fff;
}
.window-body.iframe-container .menu-option.disabled {
  color: #bcbcbc;
  cursor: default;
}
.window-body.iframe-container .menu-separator {
  border-top: 1px solid #d7d4ca;
  margin: 2px 0;
  height: 0;
}
`;
  document.head.appendChild(style);
}

function injectToolbarCSS() {
  if (document.getElementById("xp-toolbar-css")) return;
  const style = document.createElement("style");
  style.id = "xp-toolbar-css";
  style.textContent = `
.toolbar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-family: 'Tahoma', Arial, sans-serif;
  color: #222;
  padding: 6px 8px;
  border-radius: 5px;
  transition: box-shadow 0.13s, border 0.13s, background 0.13s;
  border: 1.5px solid transparent;
  box-shadow: none;
  margin: 0;
  user-select: none;
}
.toolbar-button.disabled {
  opacity: 0.5;
  cursor: default;
  pointer-events: none;
}
.toolbar-button.disabled:hover,
.toolbar-button.disabled:active {
  background: none;
  border-color: transparent;
  box-shadow: none;
}
.toolbar-button:not(.disabled):hover {
  background: #ecebe2;
  border: 1.5px solid #b9b6aa;
  box-shadow: none;
}
.toolbar-button:not(.disabled):active {
  border: 1.5px solid #888;
  box-shadow: inset 2px 2px 5px #b9b6aa, inset -1.5px -1.5px 3px #fff;
  background: #e4e3dc;
}
.toolbar-button > img + span {
  margin-left: 5px;
}
.toolbar-button > img:only-child {
  margin-right: 0;
}
.toolbar-container {
  all: initial;
  box-sizing: border-box;
  width: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  position: static;
  z-index: auto;
}
.toolbar-row {
  all: unset;
  display: flex;
  flex-direction: row;
  background: #ece9d8;
  height: 48px;
  min-height: 48px;
  max-height: 48px;
  box-sizing: border-box;
  flex-shrink: 0;
  flex-grow: 0;
  overflow: hidden;
  padding: 0 8px 0 4px;
  align-items: center;
  z-index: 20;
  position: static;
  width: 100%;
  user-select: none;
}
.vertical_line {
  width: 1px;
  height: 26px;
  background: #d7d4ca;
  margin: 0 4px;
}
.toolbar-row img, .toolbar-row span {
  margin: 0;
  padding: 0;
  user-select: none;
}
.toolbar-row > * {
  margin: 0;
}
.toolbar-row.toolbar-bottom {
  justify-content: center;
}
.toolbar-row:not(.toolbar-bottom) {
  border-bottom: 2px solid #d7d4ca;
}
.toolbar-row.toolbar-bottom {
  border-top: 2px solid #d7d4ca;
}
`;
  document.head.appendChild(style);
}

// --- MenuBar Creation ---
export function createMenuBar(menuBarConfig, windowId, parentWindowElement) {
  injectMenuBarCSS();
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
  injectToolbarCSS();
  if (!toolbarConfig || !toolbarConfig.buttons) return null;
  const toolbarWrapper = document.createElement("div");
  toolbarWrapper.className = "toolbar-container";
  const toolbarRow = document.createElement("div");
  toolbarRow.className = "toolbar-row";
  if (isBottom) toolbarRow.classList.add("toolbar-bottom");
  const isMobile = isMobileDevice && isMobileDevice();
  let buttons = toolbarConfig.buttons;
  if (isMobile && windowId === 'resume-window') {
    buttons = buttons.filter(btn => !['actual-size', 'zoom-in', 'zoom-out'].includes(btn.key));
  }
  buttons.forEach((buttonConfig) => {
    if (isMobile && buttonConfig.type === "separator") return; // Skip dividers on mobile
    if (buttonConfig.type === "separator") {
      const separator = document.createElement("div");
      separator.className = "vertical_line";
      toolbarRow.appendChild(separator);
    } else if (buttonConfig.key) {
      if (isMobile && !buttonConfig.enabled) return; // Skip disabled buttons on mobile
      // Add 'Home' text to home button on mobile
      if (isMobile && buttonConfig.key === 'home') {
        buttonConfig.text = 'Home';
      }
      // In About Me window on mobile, replace 'photos' and 'videos' buttons with new ones using correct icons and actions
      if (isMobile && windowId === 'about-window') {
        if (buttonConfig.key === 'photos') {
          buttonConfig = {
            key: 'projects',
            enabled: true,
            icon: './assets/gui/desktop/internet.webp', // My Projects icon
            text: 'My Projects',
            action: 'openProjects',
          };
        } else if (buttonConfig.key === 'videos') {
          buttonConfig = {
            key: 'resume',
            enabled: true,
            icon: './assets/gui/desktop/resume.webp', // My Resume icon
            text: 'My Resume',
            action: 'openResume',
          };
        }
      }
      // Rename save button to Download everywhere
      if (buttonConfig.key === 'save') {
        buttonConfig.text = 'Download';
      }
      // Use Contact Me program icon for the contact button
      if (buttonConfig.key === 'email') {
        buttonConfig.icon = './assets/gui/desktop/contact.webp';
      }
      const buttonDiv = document.createElement("div");
      buttonDiv.className = `toolbar-button ${buttonConfig.key}`;
      if (!buttonConfig.enabled) buttonDiv.classList.add("disabled");
      if (buttonConfig.action)
        buttonDiv.setAttribute("data-action", buttonConfig.action);
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
    // Spacer to push minimize/close buttons to the right
    const spacer = document.createElement("div");
    spacer.style.flex = "1";
    toolbarRow.appendChild(spacer);
    // Divider to the left of minimize button
    const minDivider = document.createElement("div");
    minDivider.className = "vertical_line";
    toolbarRow.appendChild(minDivider);
    // Minimize button (match other toolbar buttons)
    const minimizeBtn = document.createElement("div");
    minimizeBtn.className = "toolbar-button toolbar-minimize-button";
    minimizeBtn.setAttribute("aria-label", "Minimize");
    minimizeBtn.innerHTML = `<img alt="minimize" width="25" height="25" src="assets/gui/toolbar/min.webp" />`;
    minimizeBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      // Find the parent window element and dispatch the minimize event (handled by WindowManager)
      let parent = toolbarWrapper.parentElement;
      while (parent && !parent.classList.contains("app-window")) {
        parent = parent.parentElement;
      }
      if (parent) {
        parent.dispatchEvent(new CustomEvent("minimize-window", { bubbles: false }));
      }
    });
    toolbarRow.appendChild(minimizeBtn);
    // Close button (match other toolbar buttons)
    const closeBtn = document.createElement("div");
    closeBtn.className = "toolbar-button toolbar-close-button";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = `<img alt="close" width="25" height="25" src="assets/gui/toolbar/delete.webp" />`;
    closeBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      // Find the parent window element and dispatch the close event
      let parent = toolbarWrapper.parentElement;
      while (parent && !parent.classList.contains("app-window")) {
        parent = parent.parentElement;
      }
      if (parent) {
        parent.dispatchEvent(new CustomEvent("request-close-window", { bubbles: false }));
      }
    });
    toolbarRow.appendChild(closeBtn);
  }
  toolbarWrapper.appendChild(toolbarRow);
  return toolbarWrapper;
}
