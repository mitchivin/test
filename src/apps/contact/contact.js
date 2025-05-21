// ==================================================
//  contact.js — Contact App Interactivity for Windows XP Simulation
//  Handles form data collection, message sending, and iframe communication.
// ==================================================

const fromInput = document.getElementById("contact-from");
const subjectInput = document.getElementById("contact-subject");
const messageTextarea = document.getElementById("contact-message");

function getFormData() {
  return {
    to: '"Mitch Ivin" <mitchellivin@gmail.com>',
    from: fromInput ? fromInput.value : "",
    subject: subjectInput ? subjectInput.value : "",
    message: messageTextarea ? messageTextarea.value : "",
  };
}

document.addEventListener("DOMContentLoaded", () => {
  function clearForm() {
    if (fromInput) fromInput.value = "";
    if (subjectInput) subjectInput.value = "";
    if (messageTextarea) messageTextarea.value = "";
  }

  window.addEventListener("message", (event) => {
    if (event.data && typeof event.data === "object") {
      // Accept both command: 'getFormData' and type: 'getContactFormData'
      if (
        event.data.command === "getFormData" ||
        event.data.type === "getContactFormData"
      ) {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(
            {
              type: "contactFormDataResponse",
              data: getFormData(),
              sourceWindowId: event.data.sourceWindowId,
            },
            "*",
          );
        }
        return;
      }
      switch (event.data.command) {
        case "newMessage":
          clearForm();
          break;
      }
    }
    if (event.data && event.data.type === "toolbar-action") {
      if (event.data.action === "newMessage") {
        clearForm();
      } else if (event.data.action === "sendMessage") {
        sendMessage();
      }
    }
  });
});

function notifyParentIframeInteraction() {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(
      { type: "iframe-interaction", windowId: window.name },
      "*",
    );
  }
}

document.addEventListener("click", notifyParentIframeInteraction, true);

function sendMessage() {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(
      {
        type: "contactFormDataResponse",
        data: getFormData(),
      },
      "*",
    );
  }
}

// Prevent pinch-zoom and multi-touch gestures for consistent UX
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
