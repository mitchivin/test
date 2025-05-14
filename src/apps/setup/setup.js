// Setup Wizard for resume.webp asset and About Me paragraph
const mainTitleElement = document.querySelector('.setup-container > h1'); // Added for dynamic title
const fileInput = document.getElementById('resume-image');
const previewImg = document.getElementById('resume-preview');
const statusDiv = document.getElementById('status');
const resumeForm = document.getElementById('resume-form');

const aboutMeForm = document.getElementById('aboutme-form');
const aboutMeParagraphsList = document.getElementById('aboutme-paragraphs-list');
const addParagraphBtn = document.getElementById('add-paragraph-btn');
const aboutMeStatus = document.getElementById('aboutme-status');

const leftPanelForm = document.getElementById('leftpanel-form');
const skillsList = document.getElementById('skills-list');
const addSkillBtn = document.getElementById('add-skill-btn');
const softwareList = document.getElementById('software-list');
const addSoftwareBtn = document.getElementById('add-software-btn');
const leftPanelStatus = document.getElementById('leftpanel-status');

const contactForm = document.getElementById('contact-form');
const contactToNameInput = document.getElementById('contact-to-name');
const contactToEmailInput = document.getElementById('contact-to-email');
const contactStatus = document.getElementById('contact-status');

const projectsForm = document.getElementById('projects-form');
const projectsList = document.getElementById('projects-list');
const addProjectBtn = document.getElementById('add-project-btn');
const projectsStatus = document.getElementById('projects-status');

// --- Navigation Buttons ---
const resumeNextBtn = document.getElementById('resume-next-btn');
const aboutMeBackBtn = document.getElementById('aboutme-back-btn');
const aboutMeNextBtn = document.getElementById('aboutme-next-btn');
const aboutMeSaveBtn = document.getElementById('aboutme-save-btn'); // Submit button
const leftPanelBackBtn = document.getElementById('leftpanel-back-btn');
const leftPanelNextBtn = document.getElementById('leftpanel-next-btn');
const leftPanelSaveBtn = document.getElementById('leftpanel-save-btn'); // Submit button
const contactBackBtn = document.getElementById('contact-back-btn');
const contactNextBtn = document.getElementById('contact-next-btn');
const contactSaveBtn = document.getElementById('contact-save-btn'); // Submit button
const projectsBackBtn = document.getElementById('projects-back-btn');
const projectsSaveBtn = document.getElementById('projects-save-btn'); // Submit button
const resetBtn = document.getElementById('reset-btn');

// --- localStorage Keys ---
const LOCAL_KEY_RESUME = 'custom_resume_webp';
const LOCAL_KEY_ABOUT_PARAGRAPHS = 'custom_about_paragraphs';
const LOCAL_KEY_SKILLS = 'custom_about_skills';
const LOCAL_KEY_SOFTWARE = 'custom_about_software';
const LOCAL_KEY_CONTACT_NAME = 'custom_contact_to_name';
const LOCAL_KEY_CONTACT_EMAIL = 'custom_contact_to_email';
const LOCAL_KEY_PROJECTS = 'custom_projects';

// --- Defaults ---
const DEFAULT_PARAGRAPH_ICONS = [
  '../../../assets/apps/about/p1.webp', '../../../assets/apps/about/p2.webp',
  '../../../assets/apps/about/p3.webp', '../../../assets/apps/about/p4.webp',
  '../../../assets/apps/about/p5.webp',
];
const DEFAULT_SKILLS = [
  { text: 'Social Graphics', icon: '../../../assets/apps/about/skill1.webp' },
  { text: 'Web Design', icon: '../../../assets/apps/about/skill2.webp' },
  { text: 'Video Production', icon: '../../../assets/apps/about/skill3.webp' },
  { text: 'Print Design', icon: '../../../assets/apps/about/skill4.webp' },
  { text: 'Motion Graphics', icon: '../../../assets/apps/about/skill5.webp' },
];
const DEFAULT_SOFTWARE = [
  { text: 'Adobe Creative Cloud', icon: '../../../assets/apps/about/software1.webp' },
  { text: 'Figma', icon: '../../../assets/gui/start-menu/vanity-apps/figma.webp' },
  { text: 'Blender', icon: '../../../assets/gui/start-menu/vanity-apps/blender.webp' },
  { text: 'Cursor Code', icon: '../../../assets/gui/start-menu/vanity-apps/cursor.webp' },
];
const DEFAULT_CONTACT_NAME = 'Mitch Ivin';
const DEFAULT_CONTACT_EMAIL = 'mitchellivin@gmail.com';

// Global state for editable items
let aboutMeParagraphs = [];
let skills = [];
let software = [];
let projects = [];
var defaultProjectsHTML = ''; // Cache for default projects HTML

// --- RENDER FUNCTIONS ---
function renderAboutMeParagraphs(paragraphs) {
  if (!aboutMeParagraphsList) return;
  aboutMeParagraphsList.innerHTML = '';
  paragraphs.forEach((para, idx) => {
    if (typeof para === 'string') para = { text: para, icon: '' };
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex'; wrapper.style.alignItems = 'flex-start'; wrapper.style.marginBottom = '10px';
    const iconPreview = document.createElement('img');
    iconPreview.style.width = '44px'; iconPreview.style.height = '44px'; iconPreview.style.objectFit = 'contain'; iconPreview.style.marginRight = '8px';
    iconPreview.src = para.icon || DEFAULT_PARAGRAPH_ICONS[idx] || DEFAULT_PARAGRAPH_ICONS[0];
    const iconInput = document.createElement('input');
    iconInput.type = 'file'; iconInput.accept = 'image/webp'; iconInput.style.width = '90px'; iconInput.style.marginRight = '8px';
    iconInput.addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return; if (file.type !== 'image/webp') { alert('Please select a .webp image.'); return; }
      const reader = new FileReader();
      reader.onload = function(ev) { para.icon = ev.target.result; iconPreview.src = para.icon; };
      reader.readAsDataURL(file);
    });
    const textarea = document.createElement('textarea');
    textarea.rows = 4; textarea.style.width = '100%'; textarea.value = para.text; textarea.placeholder = `Paragraph ${idx + 1}`;
    textarea.addEventListener('input', e => { para.text = textarea.value; });
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button'; removeBtn.textContent = '✕'; removeBtn.title = 'Remove paragraph';
    removeBtn.style.marginLeft = '8px'; removeBtn.style.background = '#eee'; removeBtn.style.border = '1px solid #ccc'; removeBtn.style.borderRadius = '4px'; removeBtn.style.cursor = 'pointer';
    removeBtn.onclick = () => { aboutMeParagraphs.splice(idx, 1); renderAboutMeParagraphs(aboutMeParagraphs); };
    wrapper.appendChild(iconPreview); wrapper.appendChild(iconInput); wrapper.appendChild(textarea);
    if (paragraphs.length > 1) wrapper.appendChild(removeBtn);
    aboutMeParagraphsList.appendChild(wrapper);
  });
}

function renderItemList(listElement, itemsArray, defaultIconSourceArray) {
  if (!listElement) return;
  listElement.innerHTML = '';
  itemsArray.forEach((item, idx) => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex'; wrapper.style.alignItems = 'center'; wrapper.style.marginBottom = '10px';
    const iconPreview = document.createElement('img');
    iconPreview.style.width = '32px'; iconPreview.style.height = '32px'; iconPreview.style.objectFit = 'contain'; iconPreview.style.marginRight = '8px';
    iconPreview.src = item.icon || (defaultIconSourceArray[idx] ? defaultIconSourceArray[idx].icon : (defaultIconSourceArray[0] ? defaultIconSourceArray[0].icon : ''));
    const iconInput = document.createElement('input');
    iconInput.type = 'file'; iconInput.accept = 'image/webp'; iconInput.style.width = '90px'; iconInput.style.marginRight = '8px';
    iconInput.addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return; if (file.type !== 'image/webp') { alert('Please select a .webp image.'); return; }
      const reader = new FileReader();
      reader.onload = function(ev) { item.icon = ev.target.result; iconPreview.src = item.icon; };
      reader.readAsDataURL(file);
    });
    const textInput = document.createElement('input');
    textInput.type = 'text'; textInput.value = item.text; textInput.placeholder = `Item ${idx + 1}`;
    textInput.style.flex = '1';
    textInput.addEventListener('input', e => { item.text = textInput.value; });
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button'; removeBtn.textContent = '✕'; removeBtn.title = 'Remove item';
    removeBtn.style.marginLeft = '8px'; removeBtn.style.background = '#eee'; removeBtn.style.border = '1px solid #ccc'; removeBtn.style.borderRadius = '4px'; removeBtn.style.cursor = 'pointer';
    removeBtn.onclick = () => { itemsArray.splice(idx, 1); renderItemList(listElement, itemsArray, defaultIconSourceArray); };
    wrapper.appendChild(iconPreview); wrapper.appendChild(iconInput); wrapper.appendChild(textInput);
    if (itemsArray.length > 1) wrapper.appendChild(removeBtn);
    listElement.appendChild(wrapper);
  });
}

function renderProjects() {
  if (!projectsList) return;
  projectsList.innerHTML = '';
  projects.forEach((proj, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'project-edit-row';
    wrapper.style = 'border:1px solid #ccc;padding:12px;margin-bottom:12px;border-radius:6px; display: flex; flex-direction: column; gap: 8px;';
    proj.type = 'image'; // Force type to image for now
    
    function createField(labelText, inputType, value, style, onInput, isTextarea = false, accept) {
        const fieldWrapper = document.createElement('div');
        const label = document.createElement('label');
        label.textContent = labelText;
        label.style.display = 'block';
        label.style.marginBottom = '4px';
        fieldWrapper.appendChild(label);

        let input;
        if (isTextarea) {
            input = document.createElement('textarea');
            input.value = value;
        } else {
            input = document.createElement('input');
            input.type = inputType;
            input.value = value;
            if (inputType === 'file' && accept) input.accept = accept;
        }
        input.style = style || 'width: 100%; box-sizing: border-box;';
        if (onInput) input.oninput = onInput;
        fieldWrapper.appendChild(input);
        return { fieldWrapper, input };
    }

    const { fieldWrapper: srcWrapper, input: srcInput } = createField('Image Source (URL or Upload):', 'text', proj.src, 'width: calc(100% - 100px); margin-right: 8px; box-sizing: border-box; display: inline-block;', e => { proj.src = e.target.value; });
    const srcFile = document.createElement('input');
    srcFile.type = 'file'; srcFile.accept = 'image/webp,image/png,image/jpeg'; srcFile.style='width: 90px; display: inline-block;';
    srcFile.onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => { proj.src = ev.target.result; srcInput.value = proj.src; };
      reader.readAsDataURL(file);
    };
    srcWrapper.appendChild(srcFile);
    
    const { fieldWrapper: titleWrapper } = createField('Title:', 'text', proj['data-title'] || '', null, e => { proj['data-title'] = e.target.value; });
    const { fieldWrapper: descWrapper } = createField('Description:', 'text', proj['data-description'] || '', 'width:100%;min-height:40px;box-sizing: border-box;', e => { proj['data-description'] = e.target.value; }, true);
    const { fieldWrapper: mobDescWrapper } = createField('Mobile Description (optional):', 'text', proj['data-mobileDescription'] || '', 'width:100%;min-height:30px;box-sizing: border-box;', e => { proj['data-mobileDescription'] = e.target.value; }, true);
    const { fieldWrapper: linkTypeWrapper } = createField('Link Type (e.g., "external", "details"):', 'text', proj['data-linkType'] || '', null, e => { proj['data-linkType'] = e.target.value; });
    const { fieldWrapper: linkUrlWrapper } = createField('Link URL (if any):', 'text', proj['data-linkUrl'] || '', null, e => { proj['data-linkUrl'] = e.target.value; });
    const { fieldWrapper: softwareWrapper } = createField('Software Used (comma-separated):', 'text', proj['data-software'] || '', null, e => { proj['data-software'] = e.target.value; });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button'; removeBtn.textContent = 'Remove Project';
    removeBtn.style = 'background:#e74c3c;color:#fff;border:none;padding:8px 12px;border-radius:4px;cursor:pointer; align-self: flex-start; margin-top: 8px;';
    removeBtn.onclick = () => { projects.splice(idx,1); renderProjects(); };
    
    wrapper.append(srcWrapper, titleWrapper, descWrapper, mobDescWrapper, linkTypeWrapper, linkUrlWrapper, softwareWrapper, removeBtn);
    projectsList.appendChild(wrapper);
  });
}

// --- LOAD FUNCTIONS ---
function loadResumeImage() {
  if (!previewImg) return;
  const stored = localStorage.getItem(LOCAL_KEY_RESUME);
  previewImg.src = stored || '../../assets/apps/resume/resume.webp';
  if (statusDiv) statusDiv.textContent = '';
}

function loadAboutMeData() {
  const stored = localStorage.getItem(LOCAL_KEY_ABOUT_PARAGRAPHS);
  let loadedParagraphs = [];
  if (stored) {
    try { loadedParagraphs = JSON.parse(stored); } catch { /* Use default empty */ }
  }
  if (!Array.isArray(loadedParagraphs) || loadedParagraphs.length === 0) {
    loadedParagraphs = [{ text: '', icon: '' }]; // Default to one empty if nothing stored or invalid
  }
  aboutMeParagraphs = loadedParagraphs;
  renderAboutMeParagraphs(aboutMeParagraphs);
  if (aboutMeStatus) aboutMeStatus.textContent = '';
}

function loadLeftPanelData() {
  let storedSkills = localStorage.getItem(LOCAL_KEY_SKILLS);
  try { skills = storedSkills ? JSON.parse(storedSkills) : DEFAULT_SKILLS.map(i => ({ ...i })); }
  catch { skills = DEFAULT_SKILLS.map(i => ({ ...i })); }
  if (!Array.isArray(skills) || skills.length === 0) skills = DEFAULT_SKILLS.map(i => ({ ...i }));
  
  let storedSoftware = localStorage.getItem(LOCAL_KEY_SOFTWARE);
  try { software = storedSoftware ? JSON.parse(storedSoftware) : DEFAULT_SOFTWARE.map(i => ({ ...i })); }
  catch { software = DEFAULT_SOFTWARE.map(i => ({ ...i })); }
  if (!Array.isArray(software) || software.length === 0) software = DEFAULT_SOFTWARE.map(i => ({ ...i }));
  
  renderItemList(skillsList, skills, DEFAULT_SKILLS);
  renderItemList(softwareList, software, DEFAULT_SOFTWARE);
  if (leftPanelStatus) leftPanelStatus.textContent = '';
}

function loadContactData() {
  if(contactToNameInput) contactToNameInput.value = localStorage.getItem(LOCAL_KEY_CONTACT_NAME) || DEFAULT_CONTACT_NAME;
  if(contactToEmailInput) contactToEmailInput.value = localStorage.getItem(LOCAL_KEY_CONTACT_EMAIL) || DEFAULT_CONTACT_EMAIL;
  if(contactStatus) contactStatus.textContent = '';
}

function getDefaultProjectsFromHTML() {
  // This function is a placeholder. In a real scenario, you might fetch default project data
  // from a JS object or a hidden HTML structure if needed on first load or after a reset.
  // For now, it returns an empty array, implying projects must be added by the user.
  // If you have a static HTML representation of default projects, parse it here.
  // For simplicity, we will return a predefined basic structure or an empty array.
  // The Projects app itself should handle displaying actual default posts if localStorage is empty.
  return []; 
}

function loadProjectsData() {
  const stored = localStorage.getItem(LOCAL_KEY_PROJECTS);
  if (stored) {
    try { 
      projects = JSON.parse(stored); 
      if (!Array.isArray(projects)) projects = getDefaultProjectsFromHTML();
    } catch { 
      projects = getDefaultProjectsFromHTML(); 
    }
  } else {
    projects = getDefaultProjectsFromHTML();
  }
  renderProjects();
  if (projectsStatus) projectsStatus.textContent = '';
}

// --- SAVE FUNCTIONS ---
function saveResumeImage(callback) {
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    if (callback) callback(); // No new file, just proceed
    return;
  }
  const file = fileInput.files[0];
  if (file.type !== 'image/webp') {
    if(statusDiv) statusDiv.textContent = 'Please select a .webp image.';
    return;
  }
  const reader = new FileReader();
  reader.onload = function(ev) {
    localStorage.setItem(LOCAL_KEY_RESUME, ev.target.result);
    if(statusDiv) statusDiv.textContent = 'Resume saved!';
    if (callback) callback();
  };
  reader.readAsDataURL(file);
}

function saveAboutMeData() {
  const filteredParagraphs = aboutMeParagraphs.filter(p => (p.text || '').trim() !== '' || (p.icon || '').trim() !== '');
  let paragraphsToSave = filteredParagraphs;
  if (paragraphsToSave.length === 0) {
    paragraphsToSave = [{ text: '', icon: '' }]; // Keep one empty placeholder
  }
  localStorage.setItem(LOCAL_KEY_ABOUT_PARAGRAPHS, JSON.stringify(paragraphsToSave));
  aboutMeParagraphs = paragraphsToSave; // Update global state
  renderAboutMeParagraphs(aboutMeParagraphs); // Re-render
  if(aboutMeStatus) aboutMeStatus.textContent = 'About Me saved!';
  setTimeout(() => { if(aboutMeStatus) aboutMeStatus.textContent = ''; }, 1200);
}

function saveLeftPanelData() {
  const filteredSkills = skills.filter(i => (i.text || '').trim() !== '');
  let skillsToSave = filteredSkills.length > 0 ? filteredSkills : DEFAULT_SKILLS.map(i => ({ ...i }));
  localStorage.setItem(LOCAL_KEY_SKILLS, JSON.stringify(skillsToSave));
  skills = skillsToSave;

  const filteredSoftware = software.filter(i => (i.text || '').trim() !== '');
  let softwareToSave = filteredSoftware.length > 0 ? filteredSoftware : DEFAULT_SOFTWARE.map(i => ({ ...i }));
  localStorage.setItem(LOCAL_KEY_SOFTWARE, JSON.stringify(softwareToSave));
  software = softwareToSave;
  
  renderItemList(skillsList, skills, DEFAULT_SKILLS);
  renderItemList(softwareList, software, DEFAULT_SOFTWARE);
  if(leftPanelStatus) leftPanelStatus.textContent = 'Skills & Software saved!';
  setTimeout(() => { if(leftPanelStatus) leftPanelStatus.textContent = ''; }, 1200);
}

function saveContactData() {
  if(contactToNameInput && contactToEmailInput) {
    localStorage.setItem(LOCAL_KEY_CONTACT_NAME, contactToNameInput.value.trim());
    localStorage.setItem(LOCAL_KEY_CONTACT_EMAIL, contactToEmailInput.value.trim());
  }
  if(contactStatus) contactStatus.textContent = 'Contact info saved!';
  setTimeout(() => { if(contactStatus) contactStatus.textContent = ''; }, 1200);
}

function saveProjectsData() {
  const validProjects = projects.filter(p => (p.src || '').trim() !== '');
  localStorage.setItem(LOCAL_KEY_PROJECTS, JSON.stringify(validProjects));
  projects = validProjects; // Update global state
  renderProjects(); // Re-render
  if(projectsStatus) projectsStatus.textContent = 'Projects saved!';
  setTimeout(() => { if(projectsStatus) projectsStatus.textContent = ''; }, 1200);
}

// --- NAVIGATION ---
function showStep(stepName) {
  let currentStepTitle = 'Setup Wizard'; // Default title
  // Hide all forms
  if(resumeForm) resumeForm.style.display = 'none';
  if(aboutMeForm) aboutMeForm.style.display = 'none';
  if(leftPanelForm) leftPanelForm.style.display = 'none';
  if(contactForm) contactForm.style.display = 'none';
  if(projectsForm) projectsForm.style.display = 'none';

  // Hide all navigation buttons (submit buttons are part of forms, reset is separate)
  const buttonsToToggle = [
    resumeNextBtn, aboutMeBackBtn, aboutMeNextBtn, 
    leftPanelBackBtn, leftPanelNextBtn, contactBackBtn, contactNextBtn,
    projectsBackBtn 
    // Save buttons are not in this list as their visibility is tied to their form's visibility
  ];
  buttonsToToggle.forEach(btn => btn && (btn.style.display = 'none'));
  if(aboutMeSaveBtn) aboutMeSaveBtn.style.display = 'none';
  if(leftPanelSaveBtn) leftPanelSaveBtn.style.display = 'none';
  if(contactSaveBtn) contactSaveBtn.style.display = 'none';
  if(projectsSaveBtn) projectsSaveBtn.style.display = 'none';


  // Show current step's form and its relevant buttons
  switch (stepName) {
    case 'resume':
      if(resumeForm) resumeForm.style.display = 'block';
      if(resumeNextBtn) resumeNextBtn.style.display = '';
      loadResumeImage();
      currentStepTitle = 'Setup Wizard - Resume';
      break;
    case 'aboutme':
      if(aboutMeForm) aboutMeForm.style.display = 'block';
      if(aboutMeBackBtn) aboutMeBackBtn.style.display = '';
      if(aboutMeNextBtn) aboutMeNextBtn.style.display = '';
      if(aboutMeSaveBtn) aboutMeSaveBtn.style.display = '';
      loadAboutMeData();
      currentStepTitle = 'Setup Wizard - About Me';
      break;
    case 'leftpanel':
      if(leftPanelForm) leftPanelForm.style.display = 'block';
      if(leftPanelBackBtn) leftPanelBackBtn.style.display = '';
      if(leftPanelNextBtn) leftPanelNextBtn.style.display = '';
      if(leftPanelSaveBtn) leftPanelSaveBtn.style.display = '';
      loadLeftPanelData();
      currentStepTitle = 'Setup Wizard - Skills/Software';
      break;
    case 'contact':
      if(contactForm) contactForm.style.display = 'block';
      if(contactBackBtn) contactBackBtn.style.display = '';
      if(contactNextBtn) contactNextBtn.style.display = '';
      if(contactSaveBtn) contactSaveBtn.style.display = '';
      loadContactData();
      currentStepTitle = 'Setup Wizard - Contact';
      break;
    case 'projects':
      if(projectsForm) projectsForm.style.display = 'block';
      if(projectsBackBtn) projectsBackBtn.style.display = '';
      if(projectsSaveBtn) projectsSaveBtn.style.display = '';
      loadProjectsData();
      currentStepTitle = 'Setup Wizard - Projects';
      break;
  }
  if(resetBtn) resetBtn.style.display = ''; // Reset button always visible

  // Update the main title
  if (mainTitleElement) {
    mainTitleElement.textContent = currentStepTitle;
  }
}

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
  // Resume Step
  if(fileInput) fileInput.addEventListener('change', () => {
    if (!fileInput.files || fileInput.files.length === 0) {
      if(statusDiv) statusDiv.textContent = ''; return;
    }
    const file = fileInput.files[0];
    if (file.type !== 'image/webp') {
      if(statusDiv) statusDiv.textContent = 'Please select a .webp image.'; return;
    }
    const reader = new FileReader();
    reader.onload = function(ev) { if(previewImg) previewImg.src = ev.target.result; if(statusDiv) statusDiv.textContent = 'New resume ready. Click Next to save.'; };
    reader.readAsDataURL(file);
  });
  if(resumeNextBtn) resumeNextBtn.addEventListener('click', () => {
    saveResumeImage(() => {
      showStep('aboutme');
    });
  });

  // About Me Step
  if(addParagraphBtn) addParagraphBtn.addEventListener('click', () => {
    aboutMeParagraphs.push({ text: '', icon: '' });
    renderAboutMeParagraphs(aboutMeParagraphs);
  });
  if(aboutMeForm) aboutMeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveAboutMeData();
  });
  if(aboutMeBackBtn) aboutMeBackBtn.addEventListener('click', () => showStep('resume'));
  if(aboutMeNextBtn) aboutMeNextBtn.addEventListener('click', () => showStep('leftpanel'));

  // Left Panel Step
  if(addSkillBtn) addSkillBtn.addEventListener('click', () => {
    skills.push({ text: '', icon: '' });
    renderItemList(skillsList, skills, DEFAULT_SKILLS);
  });
  if(addSoftwareBtn) addSoftwareBtn.addEventListener('click', () => {
    software.push({ text: '', icon: '' });
    renderItemList(softwareList, software, DEFAULT_SOFTWARE);
  });
  if(leftPanelForm) leftPanelForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveLeftPanelData();
  });
  if(leftPanelBackBtn) leftPanelBackBtn.addEventListener('click', () => showStep('aboutme'));
  if(leftPanelNextBtn) leftPanelNextBtn.addEventListener('click', () => showStep('contact'));

  // Contact Step
  if(contactForm) contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveContactData();
  });
  if(contactBackBtn) contactBackBtn.addEventListener('click', () => showStep('leftpanel'));
  if(contactNextBtn) contactNextBtn.addEventListener('click', () => showStep('projects'));

  // Projects Step
  if(addProjectBtn) addProjectBtn.addEventListener('click', () => {
    projects.push({ type: 'image', src: '', poster: '', 'data-title': '', 'data-description': '', 'data-mobileDescription': '', 'data-linkType': '', 'data-linkUrl': '', 'data-software': '' });
    renderProjects();
  });
  if(projectsForm) projectsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveProjectsData();
  });
  if(projectsBackBtn) projectsBackBtn.addEventListener('click', () => showStep('contact'));

  // Reset Button
  if(resetBtn) resetBtn.addEventListener('click', () => {
    if (!confirm("Are you sure you want to reset all wizard settings to their defaults? This cannot be undone.")) return;
    localStorage.removeItem(LOCAL_KEY_RESUME);
    localStorage.removeItem(LOCAL_KEY_ABOUT_PARAGRAPHS);
    localStorage.removeItem(LOCAL_KEY_SKILLS);
    localStorage.removeItem(LOCAL_KEY_SOFTWARE);
    localStorage.removeItem(LOCAL_KEY_CONTACT_NAME);
    localStorage.removeItem(LOCAL_KEY_CONTACT_EMAIL);
    localStorage.removeItem(LOCAL_KEY_PROJECTS);
    
    // Reset global JS variables to defaults before reloading UI for current/first step
    aboutMeParagraphs = []; skills = []; software = []; projects = [];

    showStep('resume'); // Go to first step and reload its data (which will be defaults now)
    if(resetBtn) resetBtn.textContent = 'Reset Complete!';
    setTimeout(() => { if(resetBtn) resetBtn.textContent = 'Reset to Default'; }, 2000);
  });

  // Initial Load
  showStep('resume');
}); 