document.addEventListener('DOMContentLoaded', () => {
    const fromInput = document.getElementById('contact-from');
    const subjectInput = document.getElementById('contact-subject');
    const messageTextarea = document.getElementById('contact-message');

    function clearForm() {
        if (fromInput) fromInput.value = '';
        if (subjectInput) subjectInput.value = '';
        if (messageTextarea) messageTextarea.value = '';
    }

    function getFormData() {
        return {
            to: '"Mitch Ivin" <mitchellivin@gmail.com>',
            from: fromInput ? fromInput.value : '',
            subject: subjectInput ? subjectInput.value : '',
            message: messageTextarea ? messageTextarea.value : ''
        };
    }

    window.addEventListener('message', (event) => {
        if (event.data && typeof event.data === 'object') {
            // Accept both command: 'getFormData' and type: 'getContactFormData'
            if (event.data.command === 'getFormData' || event.data.type === 'getContactFormData') {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({
                        type: 'contactFormDataResponse',
                        data: getFormData(),
                        sourceWindowId: event.data.sourceWindowId 
                    }, '*');
                }
                return;
            }
            switch (event.data.command) {
                case 'newMessage':
                    clearForm();
                    break;
            }
        }
        if (event.data && event.data.type === 'toolbar-action') {
            if (event.data.action === 'newMessage') {
                clearForm();
            } else if (event.data.action === 'sendMessage') {
                sendMessage();
            }
        }
    });
});

function notifyParentIframeInteraction() {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'iframe-interaction', windowId: window.name }, '*');
  }
}

document.addEventListener('click', notifyParentIframeInteraction, true);

function sendMessage() {
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({
            type: 'contactFormDataResponse',
            data: {
                to: '"Mitch Ivin" <mitchellivin@gmail.com>',
                from: document.getElementById('contact-from').value,
                subject: document.getElementById('contact-subject').value,
                message: document.getElementById('contact-message').value
            }
        }, '*');
    }
} 