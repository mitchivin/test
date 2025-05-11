/**
 * eventBus.js — Event Bus Utilities for Windows XP Simulation
 *
 * Implements a publish-subscribe pattern for decoupled communication between components.
 * Provides:
 * - Centralized event name constants
 * - EventBus class for subscribing, publishing, and unsubscribing
 * - Singleton eventBus instance for global use
 *
 * Usage:
 *   import { eventBus, EVENTS } from './eventBus.js';
 *   eventBus.subscribe(EVENTS.PROGRAM_OPEN, handler);
 *
 * @module eventBus
 */

// ==================================================
//  EventBus Utilities for Windows XP Simulation
// ==================================================

// ===== Event Name Constants =====
/**
 * Centralized event name constants for the application
 *
 * @readonly
 * @enum {string}
 */
export const EVENTS = {
  // Window Management Events
  PROGRAM_OPEN: "program:open", // Request to open a program
  WINDOW_CREATED: "window:created", // Window has been created in DOM
  WINDOW_CLOSED: "window:closed", // Window has been removed from DOM
  WINDOW_FOCUSED: "window:focused", // Window has received focus
  WINDOW_MINIMIZED: "window:minimized", // Window has been minimized
  WINDOW_RESTORED: "window:restored", // Window has been restored from minimized

  // UI Control Events
  TASKBAR_ITEM_CLICKED: "taskbar:item:clicked", // Taskbar button clicked
  STARTMENU_TOGGLE: "startmenu:toggle", // Toggle start menu visibility
  STARTMENU_OPENED: "startmenu:opened", // Start menu has been opened
  STARTMENU_CLOSED: "startmenu:closed", // Start menu has been closed
  STARTMENU_CLOSE_REQUEST: "startmenu:close-request", // Request to close start menu
  LOG_OFF_REQUESTED: "logoff:requested", // User requested log off
  SHUTDOWN_REQUESTED: "shutdown:requested", // User requested shutdown
};

// ===== EventBus Class =====
/**
 * EventBus implements the publish-subscribe pattern for decoupled communication.
 *
 * Usage:
 *   import { eventBus, EVENTS } from './eventBus.js';
 *   eventBus.subscribe(EVENTS.PROGRAM_OPEN, handler);
 *
 * Edge Cases:
 *   - If there are no subscribers for an event, publish does nothing.
 *   - Unsubscribing a callback that was never subscribed is a no-op.
 */
class EventBus {
  /**
   * Create a new EventBus instance
   *
   * @constructor
   */
  constructor() {
    /**
     * Storage for event callbacks
     * @private
     * @type {Object.<string, Array.<function>>}
     */
    this.events = {};
  }

  /**
   * Subscribe to an event
   *
   * @param {string} event - Event name to subscribe to
   * @param {function} callback - Function to call when event is triggered
   * @returns {function} Unsubscribe function for easy cleanup
   * @example
   * const unsubscribe = eventBus.subscribe(EVENTS.PROGRAM_OPEN, handler);
   * // Later: unsubscribe();
   */
  subscribe(event, callback) {
    // Initialize array if needed with nullish coalescing, then push callback
    (this.events[event] ??= []).push(callback);

    // Return unsubscribe function for easy cleanup
    return () => this.unsubscribe(event, callback);
  }

  /**
   * Unsubscribe from an event.
   *
   * @param {string} event - Event name to unsubscribe from.
   * @param {function} callback - Function to unsubscribe.
   * @returns {void}
   * @example
   * eventBus.unsubscribe(EVENTS.PROGRAM_OPEN, handler);
   */
  unsubscribe(event, callback) {
    // Check if event exists and has subscribers before filtering
    if (this.events[event] && this.events[event].length > 0) {
      this.events[event] = this.events[event].filter((cb) => cb !== callback);
    }
  }

  /**
   * Publish an event to all subscribers.
   *
   * @param {string} event - Event name to publish.
   * @param {any} data - Data to pass to subscribers.
   * @returns {void}
   * @example
   * eventBus.publish(EVENTS.PROGRAM_OPEN, { programName: 'notepad' });
   */
  publish(event, data) {
    // Execute each callback with the provided data
    this.events[event]?.forEach((callback) => callback(data));
  }
}

// ===== Singleton EventBus Instance =====
/**
 * Singleton instance of EventBus for global use.
 * @type {EventBus}
 */
export const eventBus = new EventBus();

// ==================================================
// END EventBus Utilities
// ==================================================
