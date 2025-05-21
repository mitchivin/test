// ==================================================
//  contact.js — Contact App Interactivity for Windows XP Simulation
//  Handles form data collection, message sending, and iframe communication.
// ==================================================

const fromInput = document.getElementById("contact-from");
const subjectInput = document.getElementById("contact-subject");
const messageTextarea = document.getElementById("contact-message");

document.addEventListener("DOMContentLoaded", async () => {
  // Fetch info.json for contact details
  let info = null;
  try {
    const response = await fetch("../../../info.json");
    info = await response.json();
  } catch (e) {
    console.error("Failed to load info.json", e);
  }
  const contactName = info?.contact?.name || "Mitch Ivin";
  const contactEmail = info?.contact?.email || "mitchellivin@gmail.com";
  const toField = document.getElementById("contact-to");
  if (toField) {
    toField.value = `${contactName} <${contactEmail}>`;
  }

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
              data: getFormData(contactName, contactEmail),
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
        sendMessage(contactName, contactEmail);
      }
    }
  });
});

function getFormData(contactName = "Mitch Ivin", contactEmail = "mitchellivin@gmail.com") {
  return {
    to: `"${contactName}" <${contactEmail}>`,
    from: fromInput ? fromInput.value : "",
    subject: subjectInput ? subjectInput.value : "",
    message: messageTextarea ? messageTextarea.value : "",
  };
}

function sendMessage(contactName = "Mitch Ivin", contactEmail = "mitchellivin@gmail.com") {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(
      {
        type: "contactFormDataResponse",
        data: getFormData(contactName, contactEmail),
      },
      "*",
    );
  }
}

function notifyParentIframeInteraction() {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(
      { type: "iframe-interaction", windowId: window.name },
      "*",
    );
  }
}

document.addEventListener("click", notifyParentIframeInteraction, true);

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
