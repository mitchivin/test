/**
 * tooltip.js — Tooltip Utility for Windows XP Simulation
 *
 * Handles dynamic tooltips for UI elements, including:
 * - Delegated event listeners for hover/click
 * - Positioning and viewport overflow handling
 * - XP-style appearance and integration
 *
 * Usage:
 *   import { setupTooltips } from './tooltip.js';
 *   setupTooltips('.has-tooltip');
 *
 * Edge Cases:
 *   - If an element does not have a tooltip text (via data-tooltip or title), no tooltip is shown.
 *   - If the tooltip would overflow the viewport, it is repositioned to stay visible.
 *
 * @module tooltip
 */

import { isMobileDevice } from "../utils/device.js";

/**
 * Set up tooltips for all elements matching the selector using event delegation. Tooltips are shown on hover and hidden on mouse leave or click.
 *
 * @param {string} selector - CSS selector for elements that should have tooltips. Defaults to '[data-tooltip]'.
 * @param {HTMLElement} [tooltipContainer=document.body] - The container where the tooltip will be appended.
 * @param {number} [delay=100] - Delay in milliseconds before hiding the tooltip after mouseleave.
 * @param {Function} [condition=() => true] - A function that returns true if the tooltip should be shown, false otherwise. Receives the target element as an argument.
 * @returns {void}
 */
export function setupTooltips(
  selector = "[data-tooltip]",
  tooltipContainer = document.body,
  delay = 100,
  condition = () => true,
) {
  let activeTooltip = null;
  let tooltipTimeout = null;
  const tooltipElement =
    tooltipContainer.querySelector(".dynamic-tooltip") ||
    (() => {
      const el = document.createElement("div");
      el.className = "dynamic-tooltip dynamic-tooltip-style";
      tooltipContainer.appendChild(el);
      return el;
    })();
  const hideImmediately = () => {
    clearTimeout(tooltipTimeout);
    if (activeTooltip) {
      activeTooltip.style.display = "none";
    }
    activeTooltip = null;
  };
  const hideTooltip = () => {
    clearTimeout(tooltipTimeout);
    tooltipTimeout = setTimeout(hideImmediately, delay);
  };
  const showTooltip = (element) => {
    const tooltipText =
      element.getAttribute("data-tooltip") || element.getAttribute("title");
    if (!tooltipText) return;

    if (!condition(element)) return;

    clearTimeout(tooltipTimeout);
    tooltipElement.textContent = tooltipText;
    tooltipElement.style.display = "block";
    activeTooltip = tooltipElement;
    const containerRect =
      tooltipContainer === document.body
        ? { top: 0, left: 0 }
        : tooltipContainer.getBoundingClientRect();
    const { top, left } = _calculateTooltipPosition(
      element,
      tooltipElement,
      containerRect,
    );
    Object.assign(tooltipElement.style, {
      top: `${top}px`,
      left: `${left}px`,
    });
  };

  // Only attach hover/click tooltip listeners on non-mobile devices
  // Balloon tooltips triggered separately by click handlers are unaffected
  if (!isMobileDevice()) {
    // Attach delegated listeners
    document.body.addEventListener("mouseover", function (event) {
      const target = event.target.closest(selector);
      if (target) showTooltip(target);
    });
    document.body.addEventListener("mouseout", function (event) {
      const target = event.target.closest(selector);
      // Only hide if the mouse actually left the element (not just moved within it)
      if (target && !target.contains(event.relatedTarget)) hideTooltip();
    });
    document.body.addEventListener("click", function (event) {
      const target = event.target.closest(selector);
      if (target) hideImmediately();
    });
  }
}

/**
 * Calculate the top and left position for the tooltip so it appears below the element and stays within the viewport.
 *
 * @param {HTMLElement} element - The element the tooltip is for.
 * @param {HTMLElement} tooltipElement - The tooltip element (must already be in the DOM).
 * @param {DOMRect|Object} containerRect - The bounding rect of the tooltip container (usually document.body or a custom container).
 * @returns {{top: number, left: number}} The calculated top and left position for the tooltip.
 *
 * @example
 * const pos = _calculateTooltipPosition(elem, tooltipElem, document.body.getBoundingClientRect());
 * // pos.top, pos.left can be used to set tooltip position
 */
function _calculateTooltipPosition(element, tooltipElement, containerRect) {
  const targetRect = element.getBoundingClientRect();
  let top = targetRect.bottom - containerRect.top + 5;
  let left =
    targetRect.left -
    containerRect.left +
    targetRect.width / 2 -
    tooltipElement.offsetWidth / 2;
  if (top + tooltipElement.offsetHeight > window.innerHeight) {
    top = targetRect.top - containerRect.top - tooltipElement.offsetHeight - 5;
  }
  if (left + tooltipElement.offsetWidth > window.innerWidth) {
    left = window.innerWidth - tooltipElement.offsetWidth - 5;
  }
  if (left < 0) left = 5;
  return { top, left };
}
