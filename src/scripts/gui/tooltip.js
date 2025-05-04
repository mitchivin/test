/**
 * @fileoverview Utility for displaying tooltips on elements in the Windows XP simulation.
 * Tooltips appear on hover, are positioned relative to the element, and are styled for XP look.
 *
 * Usage:
 *   import { setupTooltips } from './tooltip.js';
 *   setupTooltips('.has-tooltip');
 *
 * Edge Cases:
 *   - If an element does not have a tooltip text (via data-tooltip or title), no tooltip is shown.
 *   - If the tooltip would overflow the viewport, it is repositioned to stay visible.
 */

import { isMobileDevice } from "../utils/device.js";

/**
 * Set up tooltips for all elements matching the selector. Tooltips are shown on hover and hidden on mouse leave or click.
 *
 * @param {string} selector - CSS selector for elements that should have tooltips.
 * @param {HTMLElement} [tooltipContainer=document.body] - The container where the tooltip will be appended.
 * @param {number} [delay=100] - Delay in milliseconds before hiding the tooltip after mouseleave.
 * @returns {void}
 * @example
 * // Attach tooltips to all elements with the class 'has-tooltip'
 * setupTooltips('.has-tooltip');
 */
export function setupTooltips(
  selector,
  tooltipContainer = document.body,
  delay = 100,
) {
  let activeTooltip = null;
  let tooltipTimeout = null;
  const tooltipElement =
    tooltipContainer.querySelector(".dynamic-tooltip") ||
    (() => {
      const el = document.createElement("div");
      el.className = "dynamic-tooltip";
      Object.assign(el.style, {
        position: "absolute",
        display: "none",
        zIndex: "10000",
        backgroundColor: "#FFFFE1",
        border: "1px solid #000000",
        padding: "2px 5px",
        fontSize: "8pt",
        whiteSpace: "nowrap",
        fontFamily: "Tahoma, sans-serif",
        pointerEvents: "none",
        boxShadow: "1px 1px 3px rgba(0,0,0,0.2)",
        borderRadius: "3px",
      });
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
    // Prevent tooltip if balloon is active and this is the tray network icon
    if (
      element.classList.contains("tray-network-icon") &&
      document.getElementById("balloon-root")
    )
      return;
    clearTimeout(tooltipTimeout);
    const tooltipText =
      element.getAttribute("data-tooltip") || element.getAttribute("title");
    if (!tooltipText) return;
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
    document.querySelectorAll(selector).forEach((element) => {
      element.addEventListener("mouseenter", () => showTooltip(element));
      element.addEventListener("mouseleave", hideTooltip);
      element.addEventListener("click", hideImmediately);
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
