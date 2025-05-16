/**
 * src/apps/setup/setup.js
 * 
 * Manages the Setup Wizard application logic, including step navigation,
 * dynamic content updates, and form interactions.
 */

document.addEventListener('DOMContentLoaded', () => {
    const WIZARD_STEPS = [
        { id: 'form-contact', title: 'Contact Information' },
        { id: 'form-resume', title: 'Resume Setup' },
        { id: 'form-aboutme', title: 'About Me' },
        { id: 'form-skills-software', title: 'Skills & Software' },
        { id: 'form-projectsconfig', title: 'Projects' }
    ];
    let currentStepIndex = 0;

    const mainTitleElement = document.querySelector('.wizard-header h1');
    const wizardContentElement = document.querySelector('.wizard-content');
    const wizardBackBtn = document.getElementById('wizard-back-btn');
    const wizardNextBtn = document.getElementById('wizard-next-btn');
    const wizardUpdateCloseBtn = document.getElementById('wizard-update-close-btn');
const resetBtn = document.getElementById('reset-btn');

    // About Me step elements
    const aboutMeParagraphsContainer = document.getElementById('aboutme-paragraphs-container');
    const addAboutMeParagraphBtn = document.getElementById('add-aboutme-paragraph-btn');
    const removeAboutMeParagraphBtn = document.getElementById('remove-aboutme-paragraph-btn');
    const DEFAULT_ABOUT_PARAGRAPH_COUNT = 3;

    // Store the initial state of the form and image data
    let initialState = {};

    // Image upload panel elements
    const userIconPanel = document.getElementById('user-icon-panel');
    const userIconInput = document.getElementById('user-icon-input');
    const userIconPlaceholder = document.getElementById('user-icon-placeholder');
    const removeUserIconOverlay = document.getElementById('remove-user-icon-overlay');

    const bootLogoPanel = document.getElementById('boot-logo-panel');
    const bootLogoInput = document.getElementById('boot-logo-input');
    const bootLogoPlaceholder = document.getElementById('boot-logo-placeholder');
    const removeBootLogoOverlay = document.getElementById('remove-boot-logo-overlay');

    // Resume upload panel elements
    const resumeUploadPanel = document.getElementById('resume-upload-panel');
    const resumeFileInput = document.getElementById('resume-file-input'); // Actual file input for .webp
    const resumeUploadPlaceholder = document.getElementById('resume-upload-placeholder');
    const removeResumeOverlay = document.getElementById('remove-resume-overlay');

    // PDF Resume elements (New structure)
    const pdfUploadPanel = document.getElementById('pdf-upload-panel');
    const resumePdfInput = document.getElementById('resume-pdf-input'); // This is the actual file input
    const pdfUploadPlaceholder = document.getElementById('pdf-upload-placeholder');
    const pdfUploadSuccessMessage = document.getElementById('pdf-upload-success');
    const removeResumePdfOverlay = document.getElementById('remove-resume-pdf-overlay');
    
    // Note: 'resumePdfInputTrigger' and 'resumePdfFilenameDisplay' are removed from HTML and thus from here.

    // --- Skills & Software Management ---
    const skillsList = document.getElementById('skills-list');
    const softwareList = document.getElementById('software-list');
    const addSkillBtn = document.getElementById('add-skill-btn');
    const addSoftwareBtn = document.getElementById('add-software-btn');

    const LOCAL_KEY_SKILLS = 'custom_about_skills';
    const LOCAL_KEY_SOFTWARE = 'custom_about_software';

    /**
     * Collects the current state of all relevant settings.
     * @returns {object} An object representing the current settings.
     */
    function getCurrentState() {
        const state = {};
        // Contact Info
        state.contactName = document.getElementById('contact-name')?.value || '';
        state.contactProfession = document.getElementById('contact-profession')?.value || '';
        state.contactEmail = document.getElementById('contact-email')?.value || '';
        
        // Images (from localStorage, as that's the source of truth after upload)
        state.userIcon = localStorage.getItem('custom_user_icon') || '';
        state.bootLogo = localStorage.getItem('custom_boot_logo') || '';

        // Resume (now an image-like upload)
        state.resumeWebP = localStorage.getItem('custom_resume_webp_data') || '';
        
        // Resume PDF (filename or presence indicator)
        const resumePdfStored = localStorage.getItem('custom_resume_pdf_name');
        // Explicitly check if resumePdfStored is a non-empty string
        if (resumePdfStored && resumePdfStored.trim() !== '' && pdfUploadPanel && pdfUploadPlaceholder && pdfUploadSuccessMessage && removeResumePdfOverlay) {
            pdfUploadPlaceholder.style.display = 'none';
            pdfUploadSuccessMessage.style.display = 'flex';
            pdfUploadPanel.style.borderStyle = 'solid';
            removeResumePdfOverlay.style.display = 'flex'; 
        } else if (pdfUploadPanel && pdfUploadPlaceholder && pdfUploadSuccessMessage && removeResumePdfOverlay) {
            pdfUploadPlaceholder.style.display = 'flex';
            pdfUploadSuccessMessage.style.display = 'none';
            pdfUploadPanel.style.borderStyle = 'dashed';
            removeResumePdfOverlay.style.display = 'none';
        }

        // About Me
        const aboutMeParagraphs = [];
        if (aboutMeParagraphsContainer) {
            aboutMeParagraphsContainer.querySelectorAll('.field-group').forEach((group, index) => {
                const textarea = group.querySelector('textarea');
                const iconImg = group.querySelector(`#paragraph-icon-img-${index}`);
                if (textarea) {
                    aboutMeParagraphs.push({
                        text: textarea.value,
                        icon: iconImg?.dataset.iconData || '' // Get iconData from img dataset
                    });
                }
            });
        }
        state.custom_about_paragraphs = JSON.stringify(aboutMeParagraphs);

        // --- Add Skills & Software to state ---
        state.custom_about_skills = JSON.stringify(getSkillsFromDOM());
        state.custom_about_software = JSON.stringify(getSoftwareFromDOM());

        // Start Menu
        state.startMenuItems = Array.from(document.querySelectorAll('#form-startmenu input[type="checkbox"]'))
                                    .filter(cb => cb.checked)
                                    .map(cb => cb.value)
                                    .sort() // Sort for consistent comparison
                                    .join(',');
        
        // TODO: Add state for dynamically added lists if needed (skills, projects, experiences, links)
        // This would require serializing the content of those lists.
        return state;
    }

    /**
     * Captures the initial state after loading.
     */
    function captureInitialState() {
        initialState = getCurrentState();
    }

    /**
     * Checks if the current state differs from the initial state and updates button.
     */
    function checkIfChanged() {
        const currentState = getCurrentState();
        const changed = JSON.stringify(currentState) !== JSON.stringify(initialState);
        if (wizardUpdateCloseBtn) {
            wizardUpdateCloseBtn.disabled = !changed;
        }
    }

    /**
     * Loads settings from localStorage and pre-fills form fields.
     * Populates with defaults if localStorage items are not found.
     */
    function loadSettings() {
        const contactNameInput = document.getElementById('contact-name');
        const contactEmailInput = document.getElementById('contact-email');
        const contactProfessionInput = document.getElementById('contact-profession');

        if (contactNameInput) {
            contactNameInput.value = localStorage.getItem('custom_contact_to_name') || 'Mitch Ivin'; // Default to 'Mitch Ivin'
        }
        if (contactEmailInput) {
            contactEmailInput.value = localStorage.getItem('custom_contact_to_email') || 'mitchellivin@gmail.com'; // Default to 'mitchellivin@gmail.com'
        }
        if (contactProfessionInput) { // Profession doesn't affect contact.js, so clear or use a default placeholder
            contactProfessionInput.value = localStorage.getItem('custom_contact_profession') || ''; // Assuming profession might be stored for other uses
        }

        // Load images for panels
        const userIconData = localStorage.getItem('custom_user_icon');
        if (userIconData && userIconPanel && userIconPlaceholder) {
            userIconPanel.style.backgroundImage = `url(${userIconData})`;
            userIconPlaceholder.style.display = 'none';
            userIconPanel.style.borderStyle = 'solid'; // Change border on load if image exists
            if (removeUserIconOverlay) removeUserIconOverlay.style.display = 'flex'; // Show remove button
        } else if (userIconPanel) {
            userIconPanel.style.backgroundImage = '';
            if (userIconPlaceholder) userIconPlaceholder.style.display = 'flex';
            userIconPanel.style.borderStyle = 'dashed';
            if (removeUserIconOverlay) removeUserIconOverlay.style.display = 'none'; // Hide remove button
        }

        const bootLogoData = localStorage.getItem('custom_boot_logo');
        if (bootLogoData && bootLogoPanel && bootLogoPlaceholder) {
            bootLogoPanel.style.backgroundImage = `url(${bootLogoData})`;
            bootLogoPlaceholder.style.display = 'none';
            bootLogoPanel.style.borderStyle = 'solid'; // Change border on load if image exists
            if (removeBootLogoOverlay) removeBootLogoOverlay.style.display = 'flex'; // Show remove button
        } else if (bootLogoPanel) {
            bootLogoPanel.style.backgroundImage = '';
            if (bootLogoPlaceholder) bootLogoPlaceholder.style.display = 'flex';
            bootLogoPanel.style.borderStyle = 'dashed';
            if (removeBootLogoOverlay) removeBootLogoOverlay.style.display = 'none'; // Hide remove button
        }

        // Load resume .webp data
        const resumeWebPData = localStorage.getItem('custom_resume_webp_data');
        if (resumeWebPData && resumeUploadPanel && resumeUploadPlaceholder) {
            resumeUploadPanel.style.backgroundImage = `url(${resumeWebPData})`;
            resumeUploadPlaceholder.style.display = 'none';
            resumeUploadPanel.style.borderStyle = 'solid';
            if (removeResumeOverlay) removeResumeOverlay.style.display = 'flex';
        } else if (resumeUploadPanel) {
            resumeUploadPanel.style.backgroundImage = '';
            if (resumeUploadPlaceholder) resumeUploadPlaceholder.style.display = 'flex';
            resumeUploadPanel.style.borderStyle = 'dashed';
            if (removeResumeOverlay) removeResumeOverlay.style.display = 'none';
        }

        // Load Resume PDF filename
        const resumePdfName = localStorage.getItem('custom_resume_pdf_name');
        if (resumePdfName && pdfUploadPanel && pdfUploadPlaceholder && pdfUploadSuccessMessage && removeResumePdfOverlay) {
            pdfUploadPlaceholder.style.display = 'none';
            pdfUploadSuccessMessage.style.display = 'flex';
            pdfUploadPanel.style.borderStyle = 'solid';
            removeResumePdfOverlay.style.display = 'flex';
        } else if (pdfUploadPanel && pdfUploadPlaceholder && pdfUploadSuccessMessage && removeResumePdfOverlay) {
            pdfUploadPlaceholder.style.display = 'flex';
            pdfUploadSuccessMessage.style.display = 'none';
            pdfUploadPanel.style.borderStyle = 'dashed';
            removeResumePdfOverlay.style.display = 'none';
        }

        // Load About Me paragraphs
        const storedAboutParagraphs = localStorage.getItem('custom_about_paragraphs');
        let aboutParagraphsData = [];
        if (storedAboutParagraphs) {
            try {
                aboutParagraphsData = JSON.parse(storedAboutParagraphs);
                // Ensure it's an array of objects, not just strings from old format
                if (Array.isArray(aboutParagraphsData) && typeof aboutParagraphsData[0] === 'string') {
                    aboutParagraphsData = aboutParagraphsData.map(text => ({ text, icon: '' }));
                }
                 if (!Array.isArray(aboutParagraphsData)) aboutParagraphsData = []; // Fallback if not array
            } catch (e) {
                console.error('Error parsing custom_about_paragraphs from localStorage', e);
                aboutParagraphsData = [];
            }
        }
        
        if (aboutParagraphsData.length === 0) {
            // If nothing in localStorage, create default empty fields
            for (let i = 0; i < DEFAULT_ABOUT_PARAGRAPH_COUNT; i++) {
                aboutParagraphsData.push({ text: '', icon: '' });
            }
        }
        renderAboutMeParagraphs(aboutParagraphsData);

        // After rendering, if icons were loaded from localStorage, apply them to the img tags
        if (aboutMeParagraphsContainer && aboutParagraphsData.length > 0) {
            aboutParagraphsData.forEach((para, index) => {
                const iconArea = aboutMeParagraphsContainer.querySelector(`#paragraph-icon-area-${index}`);
                if (iconArea && para.icon && para.icon.startsWith('data:image')) {
                    const iconImg = iconArea.querySelector(`#paragraph-icon-img-${index}`);
                    const placeholderContent = iconArea.querySelector('.icon-placeholder-content');
                    const removeBtn = iconArea.querySelector('.remove-paragraph-icon-btn');
                    if (iconImg && placeholderContent && removeBtn) {
                        iconImg.src = para.icon;
                        iconImg.dataset.iconData = para.icon;
                        iconImg.style.display = 'block';
                        placeholderContent.style.display = 'none';
                        removeBtn.style.display = 'flex'; // Show remove button
                    }
                }
            });
        }

        // TODO: Add loading logic for other wizard steps using their specific localStorage keys and defaults
    }

    /**
     * Saves current form settings to localStorage.
     */
    function saveSettings() {
        const contactName = document.getElementById('contact-name')?.value;
        const contactEmail = document.getElementById('contact-email')?.value;
        // const contactProfession = document.getElementById('contact-profession')?.value;

        if (typeof contactName === 'string') {
            localStorage.setItem('custom_contact_to_name', contactName);
        }
        if (typeof contactEmail === 'string') {
            localStorage.setItem('custom_contact_to_email', contactEmail);
        }
        // if (typeof contactProfession === 'string') { // If we decide to save profession
        //     localStorage.setItem('custom_contact_profession', contactProfession);
        // }

        // Save other form values
        localStorage.setItem('custom_resume_visibility', document.getElementById('resume-visibility')?.value || 'public');
        // localStorage.setItem('custom_aboutme_text', document.getElementById('aboutme-text')?.value || ''); // Old
        
        const aboutMeParagraphsToSave = [];
        if (aboutMeParagraphsContainer) {
            aboutMeParagraphsContainer.querySelectorAll('.field-group').forEach((group, index) => {
                const textarea = group.querySelector('textarea');
                const iconImg = group.querySelector(`#paragraph-icon-img-${index}`);
                if (textarea) {
                    aboutMeParagraphsToSave.push({
                        text: textarea.value,
                        icon: iconImg?.dataset.iconData || '' // Save iconData from img dataset
                    });
                }
            });
        }
        localStorage.setItem('custom_about_paragraphs', JSON.stringify(aboutMeParagraphsToSave));
        
        const checkedStartMenuItems = Array.from(document.querySelectorAll('#form-startmenu input[type="checkbox"]:checked'))
                                        .map(cb => cb.value);
        localStorage.setItem('custom_startmenu_items', JSON.stringify(checkedStartMenuItems));

        // Note: Image data is saved directly when the file is selected (see handleImageUpload)

        // After saving, the current state becomes the new initial state for change detection
        captureInitialState();
        checkIfChanged(); // Should disable the button as current state now matches initial
    }

    /**
     * Displays the specified step in the wizard.
     * @param {number} stepIndex - The index of the step to display.
     */
    function showStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= WIZARD_STEPS.length) {
            console.error('Invalid step index:', stepIndex);
            return;
        }
        currentStepIndex = stepIndex;
        // Hide all forms
        WIZARD_STEPS.forEach(step => {
            const form = document.getElementById(step.id);
            if (form) {
                form.classList.remove('active');
            }
        });
        // Show the current step's form
        const currentStep = WIZARD_STEPS[currentStepIndex];
        const currentForm = document.getElementById(currentStep.id);
        if (currentForm) {
            currentForm.classList.add('active');
        }
        // Update the main title
        if (mainTitleElement) {
            mainTitleElement.textContent = currentStep.title;
        }
        // Update button visibility and text
        if (wizardBackBtn) {
            wizardBackBtn.disabled = currentStepIndex === 0;
        }
        if (wizardUpdateCloseBtn) {
            wizardUpdateCloseBtn.disabled = true; // Always disable on step change
        }
        if (wizardNextBtn) {
            if (currentStepIndex === WIZARD_STEPS.length - 1) {
                wizardNextBtn.textContent = 'Finish';
            } else {
                wizardNextBtn.textContent = 'Next';
            }
        }
        checkIfChanged(); // Check changes whenever a step is shown
    }

    /**
     * Handles the "Next" button click.
     */
    function handleNext() {
        if (currentStepIndex < WIZARD_STEPS.length - 1) {
            showStep(currentStepIndex + 1);
        } else {
            // This is the "Finish" button click
            saveSettings(); // Save settings on Finish
            if (window.parent && window.parent.postMessage) {
                window.parent.postMessage({ type: 'closeWindow', windowId: 'setup' }, '*');
            }
            // After finishing and saving, the current state is the new initial state
            captureInitialState(); 
            checkIfChanged(); // Re-check to disable button
        }
    }

    /**
     * Handles the "Back" button click.
     */
    function handleBack() {
        if (currentStepIndex > 0) {
            showStep(currentStepIndex - 1);
        }
    }

    /**
     * Handles the "Update & Close" button click.
     */
    function handleUpdateClose() {
        saveSettings(); // Save settings
        if (window.parent && window.parent.postMessage) {
            window.parent.postMessage({ type: 'closeWindow', windowId: 'setup-window' }, '*');
        }
        // After saving, the current state is the new initial state
        captureInitialState();
        checkIfChanged(); // Re-check to disable button
    }

    /**
     * Handles the "Reset to Default" button click.
     */
    function handleReset() {
        // eslint-disable-next-line no-restricted-globals
        if (confirm('Are you sure you want to reset all setup data to default? This action cannot be undone.')) {
            // Remove specific localStorage items
            localStorage.removeItem('custom_contact_to_name');
            localStorage.removeItem('custom_contact_to_email');
            localStorage.removeItem('custom_contact_profession'); // Profession is an input, will be cleared by form.reset()
            localStorage.removeItem('custom_user_icon');
            localStorage.removeItem('custom_boot_logo');
            localStorage.removeItem('custom_resume_webp_data');
            localStorage.removeItem('custom_resume_pdf_name');
            // localStorage.removeItem('custom_resume_visibility'); // OBSOLETE
            localStorage.removeItem('custom_about_paragraphs');
            localStorage.removeItem('custom_startmenu_items');
            localStorage.removeItem(LOCAL_KEY_SKILLS);
            localStorage.removeItem(LOCAL_KEY_SOFTWARE);

            // Reset all forms to their default state (clears inputs, textareas, file inputs, etc.)
            document.querySelectorAll('.wizard-content form').forEach(form => {
                form.reset();
            });

            // Manually update UI for image panels to placeholder state (after form.reset() clears file inputs)
            if (userIconPanel && userIconPlaceholder && removeUserIconOverlay) {
                userIconPanel.style.backgroundImage = '';
                userIconPlaceholder.style.display = 'flex';
                userIconPanel.style.borderStyle = 'dashed';
                removeUserIconOverlay.style.display = 'none';
            }
            if (bootLogoPanel && bootLogoPlaceholder && removeBootLogoOverlay) {
                bootLogoPanel.style.backgroundImage = '';
                bootLogoPlaceholder.style.display = 'flex';
                bootLogoPanel.style.borderStyle = 'dashed';
                removeBootLogoOverlay.style.display = 'none';
            }
            if (resumeUploadPanel && resumeUploadPlaceholder && removeResumeOverlay) {
                resumeUploadPanel.style.backgroundImage = '';
                resumeUploadPlaceholder.style.display = 'flex';
                resumeUploadPanel.style.borderStyle = 'dashed';
                removeResumeOverlay.style.display = 'none';
            }
            if (pdfUploadPanel && pdfUploadPlaceholder && pdfUploadSuccessMessage && removeResumePdfOverlay) {
                pdfUploadPlaceholder.style.display = 'flex';
                pdfUploadSuccessMessage.style.display = 'none';
                pdfUploadPanel.style.borderStyle = 'dashed';
                removeResumePdfOverlay.style.display = 'none';
                // resumePdfInput.value = ''; // Covered by form.reset()
            }

            // Reload/re-render settings, which will now use defaults
            loadSettings(); // This handles About Me paragraphs, contact info to their defaults
            loadSkillsSoftware(); // This handles skills and software to their defaults (4 empty rows)
            
            // Note: renderAboutMeParagraphs is called within loadSettings if no paragraphs are found in localStorage.
            // Note: Clearing specific lists like #skills-list, #projects-list is now redundant 
            // as renderSkills/renderSoftware (called by loadSkillsSoftware) and form.reset() cover this.

            alert('Setup data reset to default!');
            
            // After resetting and loading defaults, capture the new initial state for change detection
            captureInitialState();
            checkIfChanged(); // Update button state (should be disabled)

            // Go back to the first step
            showStep(0);
        }
    }

    // --- Image Upload Logic --- //
    function handleImageUpload(event, panelElement, placeholderElement, storageKey) {
        const file = event.target.files[0];
        if (file && panelElement && placeholderElement) {
      const reader = new FileReader();
            reader.onload = (e) => {
                panelElement.style.backgroundImage = `url(${e.target.result})`;
                placeholderElement.style.display = 'none'; // Hide placeholder
                panelElement.style.borderStyle = 'solid'; // Change to solid border
                localStorage.setItem(storageKey, e.target.result); // Save image data
                checkIfChanged(); // Check for changes after image upload
                // Show remove button
                const removeOverlay = panelElement.querySelector('.remove-image-overlay');
                if (removeOverlay) removeOverlay.style.display = 'flex';
      };
      reader.readAsDataURL(file);
        }
    }

    // Setup event listeners for file inputs and their trigger buttons
    document.querySelectorAll('.file-select-btn').forEach(button => {
        button.addEventListener('click', () => {
            const inputId = button.dataset.for;
            if (inputId) {
                document.getElementById(inputId)?.click();
            }
        });
    });

    if (userIconInput) {
        userIconInput.addEventListener('change', (event) => 
            handleImageUpload(event, userIconPanel, userIconPlaceholder, 'custom_user_icon')
        );
    }

    if (bootLogoInput) {
        bootLogoInput.addEventListener('change', (event) => 
            handleImageUpload(event, bootLogoPanel, bootLogoPlaceholder, 'custom_boot_logo')
        );
    }

    if (resumeFileInput) {
        resumeFileInput.addEventListener('change', (event) => 
            handleImageUpload(event, resumeUploadPanel, resumeUploadPlaceholder, 'custom_resume_webp_data')
        );
    }

    // --- PDF Resume Upload Logic --- // 
    function handlePdfUpload(event) {
        const file = event.target.files[0];
        if (file && pdfUploadPanel && pdfUploadPlaceholder && pdfUploadSuccessMessage && removeResumePdfOverlay) {
            localStorage.setItem('custom_resume_pdf_name', file.name); // Store filename as before, or a success marker
            pdfUploadPlaceholder.style.display = 'none';
            pdfUploadSuccessMessage.style.display = 'flex';
            pdfUploadPanel.style.borderStyle = 'solid';
            removeResumePdfOverlay.style.display = 'flex';
            checkIfChanged();
        } else if (!file) { // Handle case where file selection is cancelled
            // If nothing was stored before, ensure placeholder is shown
            if (!localStorage.getItem('custom_resume_pdf_name') && pdfUploadPlaceholder && pdfUploadSuccessMessage && pdfUploadPanel && removeResumePdfOverlay) {
                pdfUploadPlaceholder.style.display = 'flex';
                pdfUploadSuccessMessage.style.display = 'none';
                pdfUploadPanel.style.borderStyle = 'dashed';
                removeResumePdfOverlay.style.display = 'none';
            }
        }
    }

    function removeUploadedPdf() {
        localStorage.removeItem('custom_resume_pdf_name');
        if (pdfUploadPlaceholder && pdfUploadSuccessMessage && pdfUploadPanel && removeResumePdfOverlay) {
            pdfUploadPlaceholder.style.display = 'flex';
            pdfUploadSuccessMessage.style.display = 'none';
            pdfUploadPanel.style.borderStyle = 'dashed';
            removeResumePdfOverlay.style.display = 'none';
        }
        if (resumePdfInput) resumePdfInput.value = ''; // Clear the actual file input
        checkIfChanged();
    }

    // The file select button inside the panel will trigger the input click
    // Event listener for resumePdfInput is still valid.

    if (resumePdfInput) {
        resumePdfInput.addEventListener('change', handlePdfUpload);
    }

    if (removeResumePdfOverlay) { // Changed from removeResumePdfBtn
        removeResumePdfOverlay.addEventListener('click', removeUploadedPdf);
    }

    // --- Remove Image Logic --- //
    function removeUploadedImage(panelElement, placeholderElement, removeOverlayElement, storageKey) {
        panelElement.style.backgroundImage = '';
        placeholderElement.style.display = 'flex';
        panelElement.style.borderStyle = 'dashed';
        removeOverlayElement.style.display = 'none';
        localStorage.removeItem(storageKey);
        checkIfChanged(); // Check for changes after image removal
    }

    if (removeUserIconOverlay) {
        removeUserIconOverlay.addEventListener('click', () => 
            removeUploadedImage(userIconPanel, userIconPlaceholder, removeUserIconOverlay, 'custom_user_icon')
        );
    }

    if (removeBootLogoOverlay) {
        removeBootLogoOverlay.addEventListener('click', () => 
            removeUploadedImage(bootLogoPanel, bootLogoPlaceholder, removeBootLogoOverlay, 'custom_boot_logo')
        );
    }

    if (removeResumeOverlay) {
        removeResumeOverlay.addEventListener('click', () => 
            removeUploadedImage(resumeUploadPanel, resumeUploadPlaceholder, removeResumeOverlay, 'custom_resume_webp_data')
        );
    }

    // --- Dynamic List Management --- //

    /**
     * Adds an item to a list container.
     * @param {HTMLElement} listContainer - The UL or OL element to add to.
     * @param {string} itemText - The text content of the item to add.
     */
    function addListItem(listContainer, itemText) {
        if (!listContainer || !itemText.trim()) return;
        const listItem = document.createElement('li');
        listItem.textContent = itemText.trim();
        
        // Add a remove button for the item
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = 'Remove';
        removeBtn.style.marginLeft = '10px'; // Simple styling
        removeBtn.onclick = () => listItem.remove();
        
        listItem.appendChild(removeBtn);
        listContainer.appendChild(listItem);
    }

    // Resume Form: Experience
    const addExperienceBtn = document.getElementById('add-experience-btn');
    const experienceTextarea = document.getElementById('experience-input'); // Assuming it's a textarea
    const experienceList = document.getElementById('experience-list');
    if (addExperienceBtn && experienceTextarea && experienceList) {
        addExperienceBtn.addEventListener('click', () => {
            addListItem(experienceList, experienceTextarea.value);
            experienceTextarea.value = ''; // Clear textarea
        });
    }

    // Left Panel Form: Links
    const addLinkBtn = document.getElementById('add-link-btn');
    const linkNameInput = document.getElementById('link-name');
    const linkUrlInput = document.getElementById('link-url');
    const linksList = document.getElementById('links-list');
    if (addLinkBtn && linkNameInput && linkUrlInput && linksList) {
        addLinkBtn.addEventListener('click', () => {
            const name = linkNameInput.value.trim();
            const url = linkUrlInput.value.trim();
            if (name && url) {
                addListItem(linksList, `${name} (${url})`);
                linkNameInput.value = '';
                linkUrlInput.value = '';
            }
        });
    }

    // Projects Form: Projects
    const addProjectBtn = document.getElementById('add-project-btn');
    const projectNameInput = document.getElementById('project-name');
    const projectDescriptionInput = document.getElementById('project-description');
    const projectsList = document.getElementById('projects-list');
    if (addProjectBtn && projectNameInput && projectDescriptionInput && projectsList) {
        addProjectBtn.addEventListener('click', () => {
            const name = projectNameInput.value.trim();
            const description = projectDescriptionInput.value.trim();
            if (name) { // Description can be optional
                addListItem(projectsList, `${name}${description ? ': ' + description : ''}`);
                projectNameInput.value = '';
                projectDescriptionInput.value = '';
            }
        });
    }

    // Attach event listeners to navigation buttons
    if (wizardNextBtn) {
        wizardNextBtn.addEventListener('click', handleNext);
    }
    if (wizardBackBtn) {
        wizardBackBtn.addEventListener('click', handleBack);
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', handleReset);
    }
    if (wizardUpdateCloseBtn) {
        wizardUpdateCloseBtn.addEventListener('click', handleUpdateClose);
    }

    // Initialize the first step and load settings
    loadSettings(); // Load settings before showing the first step
    captureInitialState(); // Capture the initial state *after* settings are loaded
    showStep(0); // Show the first step, which will also call checkIfChanged
    
    // Add event listeners to all relevant form inputs to detect changes
    const allInputs = document.querySelectorAll(
        '.wizard-content input[type="text"], .wizard-content input[type="email"], .wizard-content input[type="file"], .wizard-content textarea, .wizard-content select, .wizard-content input[type="checkbox"]'
    );
    allInputs.forEach(input => {
        const eventType = (input.type === 'checkbox' || input.tagName === 'SELECT') ? 'change' : 'input';
        input.addEventListener(eventType, checkIfChanged);
    });

    // --- Paragraph Icon Upload Logic ---
    function handleParagraphIconUpload(event, iconImgElement, placeholderElement) {
        const file = event.target.files[0];
        if (file && iconImgElement && placeholderElement) {
            const reader = new FileReader();
            reader.onload = (e) => {
                iconImgElement.src = e.target.result;
                iconImgElement.dataset.iconData = e.target.result;
                iconImgElement.style.display = 'block';
                placeholderElement.style.display = 'none';
                
                // Show remove button
                const removeBtn = iconImgElement.closest('.paragraph-icon-upload-area').querySelector('.remove-paragraph-icon-btn');
                if (removeBtn) removeBtn.style.display = 'flex'; // Use flex as per CSS

                checkIfChanged();
            };
            reader.readAsDataURL(file);
        } else {
            // Handle case where file selection is cancelled or no file
            if (!iconImgElement.dataset.iconData) {
                iconImgElement.src = '';
                iconImgElement.style.display = 'none';
                placeholderElement.style.display = 'block';
                
                // Hide remove button
                const removeBtn = iconImgElement.closest('.paragraph-icon-upload-area').querySelector('.remove-paragraph-icon-btn');
                if (removeBtn) removeBtn.style.display = 'none';
            }
        }
    }

    function handleRemoveParagraphIcon(iconImgElement, placeholderElement, removeButtonElement, fileInputElement) {
        iconImgElement.src = '';
        delete iconImgElement.dataset.iconData;
        iconImgElement.style.display = 'none';
        placeholderElement.style.display = 'block';
        removeButtonElement.style.display = 'none';
        if (fileInputElement) {
            fileInputElement.value = null; // Reset file input
        }
        checkIfChanged();
    }

    // --- About Me Paragraph Management ---
    function renderAboutMeParagraphs(paragraphs) {
        if (!aboutMeParagraphsContainer) return;

        const buttonControls = document.getElementById('aboutme-button-controls');

        const existingFieldGroups = aboutMeParagraphsContainer.querySelectorAll('.field-group');
        existingFieldGroups.forEach(group => group.remove());

        paragraphs.forEach((para, index) => {
            const fieldGroup = document.createElement('div');
            fieldGroup.className = 'field-group'; // CSS now handles flex, gap, align-items, margin-bottom

            // 1. Create Icon Upload Area
            const iconUploadArea = document.createElement('div');
            iconUploadArea.className = 'paragraph-icon-upload-area';
            iconUploadArea.id = `paragraph-icon-area-${index}`;

            const placeholderContent = document.createElement('span');
            placeholderContent.className = 'icon-placeholder-content';
            placeholderContent.textContent = '+'; // '+' as placeholder
            iconUploadArea.appendChild(placeholderContent);

            const iconImg = document.createElement('img');
            iconImg.id = `paragraph-icon-img-${index}`;
            iconImg.style.display = 'none'; // Initially hidden
            iconUploadArea.appendChild(iconImg);

            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = `paragraph-icon-input-${index}`;
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';
            iconUploadArea.appendChild(fileInput);

            const removeIconButton = document.createElement('div'); // Using a div, can be styled as a button
            removeIconButton.id = `remove-paragraph-icon-btn-${index}`;
            removeIconButton.className = 'remove-paragraph-icon-btn'; // For CSS styling
            removeIconButton.textContent = '×';
            removeIconButton.title = 'Remove icon';
            removeIconButton.style.display = 'none'; // Initially hidden
            iconUploadArea.appendChild(removeIconButton);

            // Event listener for the new remove button
            removeIconButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering file input click
                handleRemoveParagraphIcon(iconImg, placeholderContent, removeIconButton, fileInput);
            });

            // Make area clickable to trigger file input
            iconUploadArea.addEventListener('click', (e) => {
                // Prevent triggering file input if click is on already uploaded image or future remove button
                if (e.target === iconUploadArea || e.target === placeholderContent) {
                    fileInput.click();
                }
            });
            
            // Add event listener to fileInput 'change' event
            fileInput.addEventListener('change', (event) => {
                handleParagraphIconUpload(event, iconImg, placeholderContent);
            });

            // 2. Create Textarea
            const textarea = document.createElement('textarea');
            textarea.id = `aboutme-paragraph-${index}`;
            textarea.name = `aboutme-paragraph-${index}`;
            textarea.rows = 2;
            textarea.value = para.text || '';
            textarea.placeholder = `Paragraph ${index + 1}`;
            textarea.style.flexGrow = '1'; // Textarea takes remaining space

            textarea.addEventListener('input', checkIfChanged);
            textarea.addEventListener('input', autoAdjustTextareaHeight);

            // Append icon area and textarea to fieldGroup
            fieldGroup.appendChild(iconUploadArea);
            fieldGroup.appendChild(textarea);
            
            if (buttonControls) {
                aboutMeParagraphsContainer.insertBefore(fieldGroup, buttonControls);
            } else {
                aboutMeParagraphsContainer.appendChild(fieldGroup);
            }
        });

        aboutMeParagraphsContainer.querySelectorAll('textarea').forEach(autoAdjustTextareaHeight);

        if (removeAboutMeParagraphBtn) {
            removeAboutMeParagraphBtn.disabled = paragraphs.length <= 1;
        }
        checkIfChanged();
    }

    if (addAboutMeParagraphBtn) {
        addAboutMeParagraphBtn.addEventListener('click', () => {
            if (!aboutMeParagraphsContainer) return;

            // Gather current paragraphs from DOM
            const paragraphs = [];
            aboutMeParagraphsContainer.querySelectorAll('.field-group').forEach((group, index) => {
                const textarea = group.querySelector('textarea');
                const iconImg = group.querySelector(`#paragraph-icon-img-${index}`);
                paragraphs.push({
                    text: textarea ? textarea.value : '',
                    icon: iconImg?.dataset.iconData || ''
                });
            });
            // Add a new empty paragraph
            paragraphs.push({ text: '', icon: '' });
            // Re-render all paragraphs (with icon upload areas)
            renderAboutMeParagraphs(paragraphs);
        });
    }

    if (removeAboutMeParagraphBtn) {
        removeAboutMeParagraphBtn.addEventListener('click', () => {
            if (!aboutMeParagraphsContainer) return;
            const paragraphs = aboutMeParagraphsContainer.querySelectorAll('.field-group'); // Get field groups
            if (paragraphs.length > 1) { // Only remove if more than one paragraph exists
                aboutMeParagraphsContainer.removeChild(paragraphs[paragraphs.length - 1]);
                // Disable remove button if now only one paragraph remains
                removeAboutMeParagraphBtn.disabled = aboutMeParagraphsContainer.querySelectorAll('.field-group').length <= 1;
                checkIfChanged(); // Check changes after removing field
            } else {
                removeAboutMeParagraphBtn.disabled = true; // Should already be disabled if only 1, but ensure state
            }
        });
    }

    // --- Auto-adjust textarea height ---
    function autoAdjustTextareaHeight(eventOrTextarea) {
        const textarea = eventOrTextarea.target ? eventOrTextarea.target : eventOrTextarea;
        if (textarea && textarea.tagName === 'TEXTAREA') {
            textarea.style.height = 'auto'; // Temporarily shrink to allow scrollHeight to be accurate
            textarea.style.height = (textarea.scrollHeight) + 'px';
        }
    }

    function getSkillsFromDOM() {
        const items = [];
        skillsList?.querySelectorAll('li').forEach((li) => {
            // Only include rows with a text input (not the button row)
            const nameInput = li.querySelector('.skill-name-input');
            const iconImg = li.querySelector('.icon-upload-area img');
            if (nameInput) {
                items.push({
                    text: nameInput.value,
                    icon: iconImg?.dataset.iconData || ''
                });
            }
        });
        return items;
    }
    function getSoftwareFromDOM() {
        const items = [];
        softwareList?.querySelectorAll('li').forEach((li) => {
            // Only include rows with a text input (not the button row)
            const nameInput = li.querySelector('.software-name-input');
            const iconImg = li.querySelector('.icon-upload-area img');
            if (nameInput) {
                items.push({
                    text: nameInput.value,
                    icon: iconImg?.dataset.iconData || ''
                });
            }
        });
        return items;
    }

    function renderSkills(skills) {
        if (!skillsList) return;
        skillsList.innerHTML = '';
        skills.forEach((item, idx) => {
            const li = document.createElement('li');
            // Icon upload area (like About Me step, but smaller)
            const iconUploadArea = document.createElement('div');
            iconUploadArea.className = 'icon-upload-area';
            const placeholderContent = document.createElement('span');
            placeholderContent.className = 'icon-placeholder-content';
            placeholderContent.textContent = '+';
            iconUploadArea.appendChild(placeholderContent);
            const iconImg = document.createElement('img');
            iconImg.style.display = item.icon ? 'block' : 'none';
            if (item.icon) {
                iconImg.src = item.icon;
                placeholderContent.style.display = 'none';
            }
            iconUploadArea.appendChild(iconImg);
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';
            iconUploadArea.appendChild(fileInput);
            iconUploadArea.addEventListener('click', (e) => {
                if (e.target === iconUploadArea || e.target === placeholderContent) fileInput.click();
            });
            fileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        iconImg.src = e.target.result;
                        iconImg.style.display = 'block';
                        placeholderContent.style.display = 'none';
                        iconImg.dataset.iconData = e.target.result;
                        saveSkillsSoftware();
                        checkIfChanged();
                    };
                    reader.readAsDataURL(file);
                }
            });
            li.appendChild(iconUploadArea);
            // Name input
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.className = 'skill-name-input';
            nameInput.value = item.text || '';
            nameInput.placeholder = 'Skill name';
            nameInput.addEventListener('input', () => {
                saveSkillsSoftware();
                checkIfChanged();
            });
            li.appendChild(nameInput);
            skillsList.appendChild(li);
        });
        // Add/Remove buttons as last li
        const btnLi = document.createElement('li');
        btnLi.className = 'skills-btn-row';
        btnLi.style.display = 'flex';
        btnLi.style.gap = '10px';
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.id = 'add-skill-btn';
        addBtn.className = 'window-button';
        addBtn.textContent = 'Add';
        addBtn.addEventListener('click', () => {
            const skills = getSkillsFromDOM();
            skills.push({ text: '', icon: '' });
            renderSkills(skills);
            saveSkillsSoftware();
            checkIfChanged();
        });
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.id = 'remove-skill-btn';
        removeBtn.className = 'window-button';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
            const skills = getSkillsFromDOM();
            if (skills.length > 0) {
                skills.pop();
                renderSkills(skills);
                saveSkillsSoftware();
                checkIfChanged();
            } else {
                checkIfChanged();
            }
        });
        btnLi.appendChild(addBtn);
        btnLi.appendChild(removeBtn);
        skillsList.appendChild(btnLi);
        checkIfChanged();
    }

    function renderSoftware(software) {
        if (!softwareList) return;
        softwareList.innerHTML = '';
        software.forEach((item, idx) => {
            const li = document.createElement('li');
            // Icon upload area (like About Me step, but smaller)
            const iconUploadArea = document.createElement('div');
            iconUploadArea.className = 'icon-upload-area';
            const placeholderContent = document.createElement('span');
            placeholderContent.className = 'icon-placeholder-content';
            placeholderContent.textContent = '+';
            iconUploadArea.appendChild(placeholderContent);
            const iconImg = document.createElement('img');
            iconImg.style.display = item.icon ? 'block' : 'none';
            if (item.icon) {
                iconImg.src = item.icon;
                placeholderContent.style.display = 'none';
            }
            iconUploadArea.appendChild(iconImg);
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';
            iconUploadArea.appendChild(fileInput);
            iconUploadArea.addEventListener('click', (e) => {
                if (e.target === iconUploadArea || e.target === placeholderContent) fileInput.click();
            });
            fileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        iconImg.src = e.target.result;
                        iconImg.style.display = 'block';
                        placeholderContent.style.display = 'none';
                        iconImg.dataset.iconData = e.target.result;
                        saveSkillsSoftware();
                        checkIfChanged();
                    };
                    reader.readAsDataURL(file);
                }
            });
            li.appendChild(iconUploadArea);
            // Name input
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.className = 'software-name-input';
            nameInput.value = item.text || '';
            nameInput.placeholder = 'Software name';
            nameInput.addEventListener('input', () => {
                saveSkillsSoftware();
                checkIfChanged();
            });
            li.appendChild(nameInput);
            softwareList.appendChild(li);
        });
        // Add/Remove buttons as last li
        const btnLi = document.createElement('li');
        btnLi.className = 'software-btn-row';
        btnLi.style.display = 'flex';
        btnLi.style.gap = '10px';
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.id = 'add-software-btn';
        addBtn.className = 'window-button';
        addBtn.textContent = 'Add';
        addBtn.addEventListener('click', () => {
            const software = getSoftwareFromDOM();
            software.push({ text: '', icon: '' });
            renderSoftware(software);
            saveSkillsSoftware();
            checkIfChanged();
        });
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.id = 'remove-software-btn';
        removeBtn.className = 'window-button';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
            const software = getSoftwareFromDOM();
            if (software.length > 0) {
                software.pop();
                renderSoftware(software);
                saveSkillsSoftware();
                checkIfChanged();
            } else {
                checkIfChanged();
            }
        });
        btnLi.appendChild(addBtn);
        btnLi.appendChild(removeBtn);
        softwareList.appendChild(btnLi);
        checkIfChanged();
    }

    function saveSkillsSoftware() {
        const skills = getSkillsFromDOM();
        const software = getSoftwareFromDOM();
        localStorage.setItem(LOCAL_KEY_SKILLS, JSON.stringify(skills));
        localStorage.setItem(LOCAL_KEY_SOFTWARE, JSON.stringify(software));
    }

    function loadSkillsSoftware() {
        let skills = [];
        let software = [];
        try {
            const storedSkills = localStorage.getItem(LOCAL_KEY_SKILLS);
            if (storedSkills) skills = JSON.parse(storedSkills);
        } catch {}
        try {
            const storedSoftware = localStorage.getItem(LOCAL_KEY_SOFTWARE);
            if (storedSoftware) software = JSON.parse(storedSoftware);
        } catch {}
        // Default to 4 empty entries if none saved
        if (!skills || skills.length === 0) {
            skills = Array.from({length: 4}, () => ({ text: '', icon: '' }));
        }
        if (!software || software.length === 0) {
            software = Array.from({length: 4}, () => ({ text: '', icon: '' }));
        }
        renderSkills(skills);
        renderSoftware(software);
    }

    if (addSkillBtn) {
        addSkillBtn.addEventListener('click', () => {
            const skills = getSkillsFromDOM();
            skills.push({ text: '', icon: '' });
            renderSkills(skills);
            saveSkillsSoftware();
            checkIfChanged();
        });
    }
    if (addSoftwareBtn) {
        addSoftwareBtn.addEventListener('click', () => {
            const software = getSoftwareFromDOM();
            software.push({ text: '', icon: '' });
            renderSoftware(software);
            saveSkillsSoftware();
            checkIfChanged();
        });
    }

    // Load on wizard init
    loadSkillsSoftware();

    // Add event listeners for Remove Skills and Remove Software buttons
    const removeSkillBtn = document.getElementById('remove-skill-btn');
    const removeSoftwareBtn = document.getElementById('remove-software-btn');
    if (removeSkillBtn) {
      removeSkillBtn.addEventListener('click', () => {
        const skills = getSkillsFromDOM();
        if (skills.length > 0) {
          skills.pop();
          renderSkills(skills);
          saveSkillsSoftware();
          checkIfChanged();
        } else {
          checkIfChanged();
        }
      });
    }
    if (removeSoftwareBtn) {
      removeSoftwareBtn.addEventListener('click', () => {
        const software = getSoftwareFromDOM();
        if (software.length > 0) {
          software.pop();
          renderSoftware(software);
          saveSkillsSoftware();
          checkIfChanged();
        } else {
          checkIfChanged();
        }
      });
    }
}); 