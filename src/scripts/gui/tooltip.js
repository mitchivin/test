/**
 * @fileoverview Tooltip utilities for Windows XP simulation.
 * @description Provides dynamic, XP-style tooltips for UI elements, handling positioning, event delegation, and viewport boundaries.
 * @module scripts/gui/tooltip
 * @file src/scripts/gui/tooltip.js
 */

import { isMobileDevice } from "../utils/device.js";

/**
 * Sets up dynamic tooltips for elements matching the given selector.
 * Uses event delegation to show tooltips on hover and hide them on mouse leave or click.
 * On mobile devices, hover/click-triggered tooltips are generally not attached by this setup.
 *
 * @param {string} [selector="[data-tooltip]"] - CSS selector for elements that should have tooltips.
 *        Elements should have a `data-tooltip` or `title` attribute.
 * @param {HTMLElement} [tooltipContainer=document.body] - The DOM element to which the tooltip will be appended.
 *        This container influences the tooltip's positioning context.
 * @param {number} [delay=100] - Delay in milliseconds before hiding the tooltip after `mouseout`.
 *        This prevents the tooltip from disappearing too quickly if the mouse briefly leaves and re-enters.
 * @param {function(HTMLElement):boolean} [condition=() => true] - A function that receives the target
 *        element and returns `true` if the tooltip should be shown, `false` otherwise.
 *        Useful for conditionally disabling tooltips (e.g., if a balloon notification is active).
 * @returns {void} Nothing.
 */
export function setupTooltips(
  selector = "[data-tooltip]",
  tooltipContainer = document.body,
  delay = 100,
  condition = () => true,
) {
  /** @type {HTMLElement | null} Stores a reference to the currently visible tooltip element, if any. */
  let activeTooltip = null;
  /** @type {number | null} Timeout ID for the hide delay, allowing cancellation if mouse re-enters. */
  let tooltipTimeout = null;

  /**
   * The single, reusable tooltip DOM element.
   * It's either found if it already exists in the `tooltipContainer` or created and appended.
   * @type {HTMLElement}
   */
  const tooltipElement = (() => {
    const existingTooltip = tooltipContainer.querySelector(".dynamic-tooltip");
    if (existingTooltip) return existingTooltip;

    const el = document.createElement("div");
    el.className = "dynamic-tooltip dynamic-tooltip-style"; // Basic styling class for the tooltip.
    tooltipContainer.appendChild(el);
    return el;
  })();

  /**
   * Immediately hides the active tooltip and clears any pending hide timeout.
   * @private
   */
  const hideImmediately = () => {
    clearTimeout(tooltipTimeout);
    if (activeTooltip) {
      activeTooltip.style.display = "none";
    }
    activeTooltip = null; // Reset active tooltip reference.
  };

  /**
   * Hides the active tooltip after a configured delay.
   * This delay is initiated on `mouseout` from a tooltip-triggering element.
   * @private
   */
  const hideTooltip = () => {
    clearTimeout(tooltipTimeout);
    tooltipTimeout = setTimeout(hideImmediately, delay); // Set timeout to hide.
  };

  /**
   * Shows and positions the tooltip for a given target element.
   * Fetches tooltip text from `data-tooltip` or `title` attributes.
   * Respects the `condition` function to determine if the tooltip should be shown.
   * @param {HTMLElement} element - The target element that triggered the tooltip.
   * @private
   */
  const showTooltip = (element) => {
    const tooltipText =
      element.getAttribute("data-tooltip") || element.getAttribute("title");
    if (!tooltipText) return; // No text, no tooltip.

    if (!condition(element)) return; // Condition not met, don't show.

    clearTimeout(tooltipTimeout);
    tooltipElement.textContent = tooltipText;
    tooltipElement.style.display = "block";
    activeTooltip = tooltipElement;

    // Determine positioning context based on whether the tooltip container is the document body
    // or a more specific element (which might be offset itself).
    const containerRect =
      tooltipContainer === document.body
        ? { top: 0, left: 0 } // If body, positions are relative to viewport.
        : tooltipContainer.getBoundingClientRect(); // If specific container, adjust for its offset.

    const { top, left } = _calculateTooltipPosition(
      element,
      tooltipElement,
      containerRect,
    );
    // Apply calculated position.
    Object.assign(tooltipElement.style, {
      top: `${top}px`,
      left: `${left}px`,
    });
  };

  // Standard hover/click-triggered tooltips are generally not user-friendly on touch devices.
  // This check prevents attaching these listeners on mobile.
  // Specific click-triggered tooltips (like balloon notifications) are handled separately and are not affected by this.
  if (!isMobileDevice()) {
    // Use event delegation on `document.body` for hover and click events.
    // This is more efficient than attaching listeners to each individual element.
    document.body.addEventListener("mouseover", function (event) {
      const target = event.target.closest(selector); // Find the closest ancestor matching the selector.
      if (target) showTooltip(target); // If found, show its tooltip.
    });
    document.body.addEventListener("mouseout", function (event) {
      const target = event.target.closest(selector);
      // Important: Only hide if the mouse actually left the element,
      // not just moved to a child element within it (event.relatedTarget helps here).
      if (target && !target.contains(event.relatedTarget)) hideTooltip();
    });
    document.body.addEventListener("click", function (event) {
      // On click, immediately hide any active tooltip.
      const target = event.target.closest(selector);
      if (target) hideImmediately();
    });
  }
}

/**
 * Calculates the optimal top and left position for the tooltip.
 * @description Positions the tooltip typically below the target element, adjusting to ensure
 * it stays within the viewport boundaries.
 * - Default position: Below the target element, horizontally centered.
 * - Vertical adjustment: If default position is off-screen (bottom), it flips to be above the target.
 * - Horizontal adjustment: If default or flipped position is off-screen (left/right), it's nudged
 *   to stay within viewport, with a small margin.
 *
 * @param {HTMLElement} element - The element the tooltip is associated with (the trigger).
 * @param {HTMLElement} tooltipElement - The tooltip DOM element itself (used for its dimensions).
 * @param {DOMRect|{top: number, left: number}} containerRect - The bounding rectangle of the
 *        `tooltipContainer` (from `setupTooltips`). This rect provides the `top` and `left`
 *        offsets of the container. If `tooltipContainer` is `document.body`, these are 0.
 *        The tooltip's final CSS `top` and `left` are relative to this container.
 * @returns {{top: number, left: number}} An object with `top` and `left` properties
 *         representing the calculated CSS position for the tooltip, relative to `tooltipContainer`.
 * @private
 */
function _calculateTooltipPosition(element, tooltipElement, containerRect) {
  const targetRect = element.getBoundingClientRect(); // Position of the target element relative to viewport.
  const tooltipHeight = tooltipElement.offsetHeight;
  const tooltipWidth = tooltipElement.offsetWidth;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = 5; // Small margin from element and viewport edges.

  // Calculate initial position: below the target element, centered horizontally.
  // All calculations are initially relative to the viewport, then adjusted for containerRect.
  let top = targetRect.bottom + margin;
  let left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;

  // Vertical adjustment: If it overflows viewport bottom, try placing it above the target.
  if (top + tooltipHeight > viewportHeight) {
    top = targetRect.top - tooltipHeight - margin;
  }

  // Horizontal adjustment: Ensure it's within viewport horizontal boundaries.
  if (left + tooltipWidth > viewportWidth) {
    left = viewportWidth - tooltipWidth - margin; // Align to right edge.
  }
  if (left < 0) {
    left = margin; // Align to left edge.
  }

  // Adjust top and left to be relative to the `tooltipContainer`'s origin.
  // `containerRect.top` and `containerRect.left` are the viewport-relative coordinates of the container.
  return {
    top: top - containerRect.top,
    left: left - containerRect.left,
  };
}
