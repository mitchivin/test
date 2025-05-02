// AddressBar.js - Standalone Address Bar for XP Simulation

export function createAddressBar({ icon = './assets/gui/toolbar/aboutme.webp', title = 'About Me' } = {}) {
  // Create container
  const container = document.createElement('div');
  container.className = 'addressbar-container';

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