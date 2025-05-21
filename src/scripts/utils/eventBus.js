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
  WINDOW_TOOLBAR_ACTION: "windowToolbarAction",
  PROGRAM_OPEN_INSTANCE: "programOpenInstance",
  LOG_OFF_CONFIRMATION_REQUESTED: "logOffConfirmationRequested", // New event for logoff dialog
  SHUTDOWN_REQUESTED: "shutdownRequested",

  // UI Control Events
  TASKBAR_ITEM_CLICKED: "taskbar:item:clicked", // Taskbar button clicked
  STARTMENU_TOGGLE: "startMenuToggle",
  STARTMENU_OPENED: "startmenu:opened", // Start menu has been opened
  STARTMENU_CLOSED: "startmenu:closed", // Start menu has been closed
  STARTMENU_CLOSE_REQUEST: "startmenu:close-request", // Request to close start menu
  LOG_OFF_REQUESTED: "logoff:requested", // User requested log off
};

// ===== EventBus Class =====
/**
 * EventBus implements the publish-subscribe pattern for decoupled communication.
 * Allows components to communicate without direct references.
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
   * @param {string} event - Event name to subscribe to
   * @param {function} callback - Function to call when event is triggered
   * @returns {function} Unsubscribe function for easy cleanup
   */
  subscribe(event, callback) {
    (this.events[event] ??= []).push(callback);
    return () => this.unsubscribe(event, callback);
  }

  /**
   * Unsubscribe from an event.
   * @param {string} event - Event name to unsubscribe from.
   * @param {function} callback - Function to unsubscribe.
   */
  unsubscribe(event, callback) {
    if (this.events[event] && this.events[event].length > 0) {
      this.events[event] = this.events[event].filter((cb) => cb !== callback);
    }
  }

  /**
   * Publish an event to all subscribers.
   * @param {string} event - Event name to publish.
   * @param {any} data - Data to pass to subscribers.
   */
  publish(event, data) {
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
