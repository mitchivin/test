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
            from: fromInput ? fromInput.value : '',
            subject: subjectInput ? subjectInput.value : '',
            message: messageTextarea ? messageTextarea.value : ''
        };
    }

    window.addEventListener('message', (event) => {
        if (event.data && typeof event.data === 'object') {
            switch (event.data.command) {
                case 'newMessage':
                    clearForm();
                    break;
                case 'getFormData':
                    // Respond to the parent window with the form data
                    if (window.parent && window.parent !== window) {
                        window.parent.postMessage({
                            type: 'contactFormData', // Message type for the parent to identify
                            data: getFormData(),
                            // Optionally include an identifier if the parent needs to match requests/responses
                            sourceWindowId: event.data.sourceWindowId 
                        }, '*'); // In production, specify the target origin
                    }
                    break;
            }
        }
    });
}); 