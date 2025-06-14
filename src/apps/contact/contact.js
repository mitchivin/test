/*
  contact.js — Contact App Interactivity for Windows XP Simulation
  Handles form data collection, validation, message sending simulation,
  and iframe communication for the Contact Me app.
  @file src/apps/contact/contact.js
*/

// ----- Element Selections ----- //
const fromInput = document.getElementById("contact-from");
const subjectInput = document.getElementById("contact-subject");
const messageTextarea = document.getElementById("contact-message");

// ----- Module-Scoped Contact Details ----- //
// These variables store the recipient's name and email.
// They are initialized with default values and can be updated by fetching info.json.
let moduleContactName = "Mitch Ivin";
let moduleContactEmail = "mitchellivin@gmail.com";

document.addEventListener("DOMContentLoaded", async () => {
  // ----- Fetch and Update Contact Details from info.json ----- //
  // Attempts to load contact name and email from an external configuration file.
  // Falls back to default values if fetching fails or data is missing.
  let info = null;
  try {
    const response = await fetch("../../../info.json");
    info = await response.json();
  } catch (e) {
    console.error("Failed to load info.json", e);
    // Keep default moduleContactName and moduleContactEmail if fetch fails
  }
  // Update module-scoped variables if info.json is fetched and contains contact details
  if (info && info.contact) {
    moduleContactName = info.contact.name || moduleContactName;
    moduleContactEmail = info.contact.email || moduleContactEmail;
  }

  // ----- Initialize 'To' Field ----- //
  // Sets the 'To' field with the (potentially updated) contact name and email.
  const toField = document.getElementById("contact-to");
  if (toField) {
    toField.value = `${moduleContactName} <${moduleContactEmail}>`;
  }

  /**
   * Clears all input fields in the contact form (From, Subject, Message)
   * and notifies the parent window about the updated (empty) form state.
   */
  function clearForm() {
    if (fromInput) fromInput.value = "";
    if (subjectInput) subjectInput.value = "";
    if (messageTextarea) messageTextarea.value = "";
    notifyFormState();
  }

  // ----- Message Event Listener for Inter-Window Communication ----- //
  // Handles commands and data requests sent from the parent window (main shell) or other iframes.
  window.addEventListener("message", (event) => {
    if (event.data && typeof event.data === "object") {
      // Handles requests from the parent to get the current form data.
      // Responds with 'contactFormDataResponse'.
      if (
        event.data.command === "getFormData" ||
        event.data.type === "getContactFormData"
      ) {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(
            {
              type: "contactFormDataResponse",
              data: getFormData(), // Call without arguments
              sourceWindowId: event.data.sourceWindowId,
            },
            "*",
          );
        }
        return;
      }
      // Handles a command to clear the form, typically after a message is "sent".
      switch (event.data.command) {
        case "newMessage":
          clearForm();
          break;
      }
      // Explicitly handles 'clearContactForm' message type for clearing the form.
      if (event.data.type === "clearContactForm") {
        clearForm();
      }
    }
    // Handles actions triggered from a toolbar in the parent window (e.g., "New Message", "Send Message").
    if (event.data && event.data.type === "toolbar-action") {
      if (event.data.action === "newMessage") {
        clearForm();
      } else if (event.data.action === "sendMessage") {
        sendMessage(); // Call without arguments
      }
    }
  });
});

/**
 * Retrieves the current data from the contact form fields.
 * @returns {object} An object containing the to, from, subject, and message fields.
 */
function getFormData() {
  return {
    to: `"${moduleContactName}" <${moduleContactEmail}>`,
    from: fromInput ? fromInput.value : "",
    subject: subjectInput ? subjectInput.value : "",
    message: messageTextarea ? messageTextarea.value : "",
  };
}

/**
 * Simulates sending a message by posting the form data to the parent window.
 * The parent window is expected to handle this 'contactFormDataResponse'.
 */
function sendMessage() {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(
      {
        type: "contactFormDataResponse",
        data: getFormData(), // Call without arguments
      },
      "*",
    );
  }
}

/**
 * Notifies the parent window that an interaction (click) has occurred within this iframe.
 * This helps the parent manage focus or other iframe-related UI behaviors.
 */
function notifyParentIframeInteraction() {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(
      { type: "iframe-interaction", windowId: window.name },
      "*",
    );
  }
}

// ----- Global Event Listeners for UX and iframe Communication ----- //
document.addEventListener("click", notifyParentIframeInteraction, true);

// Prevent pinch-zoom and multi-touch gestures for consistent UX across devices.
["gesturestart", "gesturechange", "gestureend"].forEach((evt) => {
  document.addEventListener(evt, (e) => e.preventDefault(), { passive: false });
});
document.addEventListener(
  "touchstart",
  (e) => {
    if (e.touches.length > 1) e.preventDefault();
  },
  { passive: false },
);
document.addEventListener(
  "touchmove",
  (e) => {
    if (e.touches.length > 1) e.preventDefault();
  },
  { passive: false },
);
let lastTouchEnd = 0;
document.addEventListener(
  "touchend",
  (event) => {
    const now = new Date().getTime();
    if (now - lastTouchEnd <= 300) event.preventDefault();
    lastTouchEnd = now;
  },
  { passive: false },
);
document.addEventListener(
  "wheel",
  (event) => {
    if (
      event.ctrlKey ||
      event.target === document.body ||
      event.target === document.documentElement
    ) {
      event.preventDefault();
    }
  },
  { passive: false },
);

/**
 * Notifies the parent window about the current state of the contact form (whether it has any user-entered values).
 * This allows the parent to, for example, enable/disable a "Send" button based on form content.
 */
function notifyFormState() {
  const hasValue =
    (fromInput && fromInput.value.trim()) ||
    (subjectInput && subjectInput.value.trim()) ||
    (messageTextarea && messageTextarea.value.trim());
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(
      {
        type: "contactFormState",
        hasValue: !!hasValue,
        windowId: window.name,
      },
      "*",
    );
  }
}

// ----- Form Input Event Listeners ----- //
// Attach input event listeners to form fields to notify parent of state changes in real-time.
[fromInput, subjectInput, messageTextarea].forEach((el) => {
  if (el) {
    el.addEventListener("input", notifyFormState);
  }
});
// Notify initial form state on document load.
window.addEventListener("DOMContentLoaded", notifyFormState);
