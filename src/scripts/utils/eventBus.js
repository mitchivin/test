/*
 * eventBus.js — Event bus utilities for Windows XP simulation.
 * Implements a publish-subscribe pattern for decoupled inter-component communication.
 * Exports standardized event names and a singleton event bus instance.
 * @file src/scripts/utils/eventBus.js
 */

// ==================================================
//  EventBus Utilities for Windows XP Simulation
// ==================================================

// ===== Event Name Constants =====
// Defines a centralized collection of event names used throughout the application
// to ensure consistency and prevent typos when publishing or subscribing to events.
/**
 * Centralized event name constants for the application.
 * These constants should be used whenever an event is published or subscribed to,
 * promoting consistency and reducing errors from typos in event names.
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

  // Music Player Events
  MUSIC_PLAYER_PLAYING: "musicplayer:playing", // Music Player has started or resumed playing a track
  MUSIC_PLAYER_STOPPED: "musicplayer:stopped", // Music Player has paused, stopped, or finished a track
  MUSIC_PLAYER_PRELOAD_READY: "musicplayer:preloadready", // Music Player UI is ready after preload
  PROGRAM_CLOSE_REQUESTED: "program:close_requested", // Request to close a program by ID
};

// ===== EventBus Class =====
// Implements the core publish-subscribe mechanism.
/**
 * @class EventBus
 * @description Implements the publish-subscribe pattern, allowing for decoupled communication
 * between different parts of the application. Components can subscribe to specific events
 * and react when those events are published, without needing direct references to each other.
 * It is highly recommended to use event names defined in the {@linkcode EVENTS} enum.
 *
 * @example
 * // How to use the eventBus:
 * import { eventBus, EVENTS } from './eventBus.js';
 *
 * // Subscriber
 * const handleProgramOpen = (data) => {
 *   console.log('Program open requested:', data.programId, 'with data:', data);
 * };
 * const unsubscribeOpenHandler = eventBus.subscribe(EVENTS.PROGRAM_OPEN, handleProgramOpen);
 *
 * // Publisher
 * eventBus.publish(EVENTS.PROGRAM_OPEN, { programId: 'notepad', someValue: 123 });
 *
 * // To clean up a specific subscription (e.g., when a component is destroyed or no longer needs to listen):
 * unsubscribeOpenHandler();
 *
 * @see {@linkcode EVENTS} for a list of standard event names.
 */
class EventBus {
  /**
   * Creates a new EventBus instance.
   * Initializes an empty object to store event listeners.
   */
  constructor() {
    /**
     * Stores event listeners. Keys are event names (strings), and values are arrays of callback functions.
     * @private
     * @type {Object.<string, Array.<function>>}
     */
    this.events = {};
  }

  /**
   * Subscribes a callback function to a specific event.
   * If the event does not exist, it initializes it with an empty array of listeners.
   * @param {string} event - The name of the event to subscribe to (ideally from {@linkcode EVENTS}).
   * @param {function} callback - The function to be executed when the event is published.
   * @returns {function} An unsubscribe function that, when called, removes this specific subscription.
   */
  subscribe(event, callback) {
    (this.events[event] ??= []).push(callback); // If this.events[event] is null/undefined, initialize as empty array, then push callback.
    return () => this.unsubscribe(event, callback); // Return a function to easily unsubscribe this specific callback.
  }

  /**
   * Unsubscribes a callback function from a specific event.
   * If the event or callback is not found, it does nothing.
   * @param {string} event - The name of the event to unsubscribe from.
   * @param {function} callback - The specific callback function to remove.
   */
  unsubscribe(event, callback) {
    if (this.events[event] && this.events[event].length > 0) {
      this.events[event] = this.events[event].filter((cb) => cb !== callback);
    }
  }

  /**
   * Publishes an event, triggering all subscribed callback functions for that event.
   * If no subscribers exist for the event, it does nothing.
   * @param {string} event - The name of the event to publish (ideally from {@linkcode EVENTS}).
   * @param {*} [data] - Optional data to pass to the event listeners.
   */
  publish(event, data) {
    // For the given event, iterate over all its subscribed callbacks and execute each one, passing the data.
    // Uses optional chaining: if this.events[event] is null/undefined, forEach is not called.
    this.events[event]?.forEach((callback) => callback(data));
  }
}

// ===== Singleton EventBus Instance =====
// Provides a single, globally accessible instance of the EventBus for the entire application.
/**
 * Singleton instance of the {@linkcode EventBus} for global application-wide event management.
 * Use this instance to subscribe to or publish events from any part of the application.
 * @type {EventBus}
 */
export const eventBus = new EventBus();

// ==================================================
// END EventBus Utilities
// ==================================================
