## Project Assets

This document lists all assets currently used in the Windows XP Clone project.

### App Specific Assets

#### About App (`assets/apps/about/`)
- `aboutbg.webp`
- `p1.webp`
- `p2.webp`
- `p3.webp`
- `p4.webp`
- `p5.webp`
- `pulldown-alt.webp`
- `pulldown.webp`
- `pullup-alt.webp`
- `pullup.webp`
- `skill1.webp`
- `skill2.webp`
- `skill3.webp`
- `skill4.webp`
- `skill5.webp`
- `software1.webp`
- `software2.webp`
- `software3.webp`
- `software4.webp`

#### Projects App (`assets/apps/projects/`)
- `image1.webp`
- `image2.webp`
- `image3.webp`
- `image4.webp`
- `image5.webp`
- `image6.webp`
- `image7.webp`
- `video1.mp4`
- `video2.mp4`
- `video3.mp4`
- `videoposter1.webp`
- `videoposter2.webp`
- `videoposter3.webp`
- `videothumb1.mp4`
- `videothumb2.mp4`
- `videothumb3.mp4`
- `voldown.webp`
- `volup.webp`

#### Resume App (`assets/apps/resume/`)
- `resume.webp`
- `resumeMitchIvin.pdf`

### GUI Assets

#### Boot (`assets/gui/boot/`)
- `boot-wordmark.webp`
- `favicon.png`
- `loading.webp`
- `userlogin.webp`

#### Desktop (`assets/gui/desktop/`)
- `about.webp`
- `bliss.jpg`
- `blissMobile.jpg`
- `contact.webp`
- `internet.webp`
- `resume.webp`

#### Start Menu (`assets/gui/start-menu/`)
- `arrow.webp`
- `behance.webp`
- `cmd.webp`
- `github.webp`
- `instagram.webp`
- `linkedin.webp`
- `logoff.webp`
- `mediaPlayer.webp`
- `music.webp`
- `notepad.webp`
- `photos.webp`
- `recently-used.webp`
- `shutdown.webp`

##### Vanity Apps (`assets/gui/start-menu/vanity-apps/`)
- `after-effects.webp`
- `blender.webp`
- `chatgpt.webp`
- `cursor.webp`
- `figma.webp`
- `illustrator.webp`
- `indesign.webp`
- `lightroom.webp`
- `photoshop.webp`
- `premiere.webp`
- `vscode.webp`

#### Taskbar (`assets/gui/taskbar/`)
- `fullscreen.webp`
- `start-button.webp`
- `system-tray.webp`
- `taskbar-bg.webp`
- `welcome.webp`

#### Toolbar (`assets/gui/toolbar/`)
- `back.webp`
- `barlogo.webp`
- `copy.webp`
- `cut.webp`
- `delete.webp`
- `desc.webp`
- `favorites.webp`
- `forward.webp`
- `go.webp`
- `home.webp`
- `new.webp`
- `paste.webp`
- `print.webp`
- `save.webp`
- `search.webp`
- `send.webp`
- `tooldropdown.webp`
- `up.webp`
- `views.webp`

### Fonts (`assets/fonts/`)
- `tahoma.woff`
- `tahoma.woff2`
- `tahomabd.woff`
- `tahomabd.woff2`

### Sounds (`assets/sounds/`)
- `logoff.wav`
- `login.wav`

## Branding

1.  **Favicon**
    *   Path: `./assets/gui/boot/favicon.png` (from `index.html`)
    *   Required Name: `favicon.png`
    *   Size: 16x16px / 32x32px (standard favicon)

## UI Images

### Boot & Login Screen

2.  **Boot/Login Screen Logo (XP Logo)**
    *   Path: `./assets/gui/boot/loading.webp` (from `index.html` for `#boot-logo` and `.xp-logo-image`)
    *   Required Name: `loading.webp`
    *   Size: Max 350px width (desktop boot), 160px height (desktop login). Hidden on very short mobile.
3.  **Boot Screen Wordmark**
    *   Path: `./assets/gui/boot/boot-wordmark.webp` (from `index.html` for `.boot-bottom-right img`)
    *   Required Name: `boot-wordmark.webp`
    *   Size: Max 32px height.
4.  **Login Screen User Picture**
    *   Path: `./assets/gui/boot/userlogin.webp` (from `index.html` for login user, and `startMenu.js` for start menu user picture)
    *   Required Name: `userlogin.webp`
    *   Size: Login: Max 80px width. Start Menu: 40x40px.

### Desktop

5.  **Desktop Background (Bliss)**
    *   Path: `./assets/gui/desktop/bliss.jpg` (preloaded in `index.html`, used in `desktop.css`)
    *   Required Name: `bliss.jpg`
    *   Size: Fullscreen.

### Taskbar

6.  **Taskbar Start Button Image**
    *   Path: `./assets/gui/taskbar/start-button.webp` (from `index.html`)
    *   Required Name: `start-button.webp`
    *   Size: Fits in button (96px width, 30px height).
7.  **Taskbar System Tray Background**
    *   Path: `./assets/gui/taskbar/system-tray.webp` (from `index.html`)
    *   Required Name: `system-tray.webp`
    *   Size: 130px width, 30px height.

### About App Specific

8.  **About App Background**
    *   Path: `url("../../../assets/apps/about/aboutbg.webp")` (from `about.css`)
    *   Required Name: `aboutbg.webp`
    *   Size: Background image, scales to container.
9.  **About App Skill Icons (General Purpose)**
    *   Paths: `../../../assets/apps/about/skill1.webp` to `skill5.webp` (from `about.html` & preloaded in `boot.js`)
    *   Required Names: `skill1.webp` ... `skill5.webp`
    *   Size: ~50x50px (container is 50px, image is `width:100%`)
10. **About App Software Icons (General Purpose)**
    *   Paths: `../../../assets/apps/about/software1.webp` to `software4.webp` (from `about.html` & preloaded in `boot.js`)
    *   Required Names: `software1.webp` ... `software4.webp`
    *   Size: ~50x50px
11. **About App Profile Card Icons (General Purpose)**
    *   Paths: `../../../assets/apps/about/p1.webp` to `p5.webp` (from `about.html` & preloaded in `boot.js`)
    *   Required Names: `p1.webp` ... `p5.webp`
    *   Size: ~50x50px

## UI Icons

### Desktop Shortcuts

12. **About Me Desktop Icon**
    *   Path: `./assets/gui/desktop/about.webp` (from `index.html`, `startMenu.js`, `programRegistry.js`)
    *   Required Name: `about.webp`
    *   Size: Desktop: 48x48px. Start Menu (All Programs): 20x20px. Start Menu (Pinned): 25x25px. Address Bar: 16x16px.
13. **My Projects (Internet) Desktop Icon**
    *   Path: `./assets/gui/desktop/internet.webp` (from `index.html`, `startMenu.js`, `programRegistry.js`)
    *   Required Name: `internet.webp`
    *   Size: Desktop: 48x48px. Start Menu (All Programs): 20x20px. Start Menu (Pinned): 25x25px.
14. **My Resume Desktop Icon**
    *   Path: `./assets/gui/desktop/resume.webp` (from `index.html`, `startMenu.js`, `programRegistry.js`)
    *   Required Name: `resume.webp` (Note: distinct from the content resume.webp)
    *   Size: Desktop: 48x48px. Start Menu (All Programs): 20x20px.
15. **Contact Me Desktop Icon**
    *   Path: `./assets/gui/desktop/contact.webp` (from `index.html`, `startMenu.js`, `programRegistry.js`)
    *   Required Name: `contact.webp`
    *   Size: Desktop: 48x48px. Start Menu (All Programs): 20x20px. Toolbar: 16x16px.

### Start Menu Specific

16. **Shutdown Icon (Login Screen & Start Menu Footer)**
    *   Path: `./assets/gui/start-menu/shutdown.webp` (from `index.html` for login, `startMenu.js` for footer)
    *   Required Name: `shutdown.webp`
    *   Size: Login: 32x32px. Start Menu Footer: 24x24px.
17. **Social Icons (All Programs Menu)**
    *   Paths: `./assets/gui/start-menu/instagram.webp`, `github.webp`, `linkedin.webp`, `behance.webp` (from `startMenu.js`)
    *   Required Names: `instagram.webp`, `github.webp`, `linkedin.webp`, `behance.webp`
    *   Size: 20x20px.
18. **Program Icons (All Programs Menu - Unique)**
    *   Paths: `./assets/gui/start-menu/photos.webp`, `mediaPlayer.webp`, `music.webp`, `notepad.webp`, `cmd.webp` (from `startMenu.js`)
    *   Required Names: `photos.webp`, `mediaPlayer.webp`, `music.webp`, `notepad.webp`, `cmd.webp`
    *   Size: 20x20px.
19. **"Recently Used" Vanity App Icons (Start Menu Left Panel)**
    *   Paths: `./assets/gui/start-menu/vanity-apps/chatgpt.webp`, `photoshop.webp`, `premiere.webp`, `illustrator.webp`, `after-effects.webp`, `blender.webp`, `cursor.webp` (from `startMenu.js`)
    *   Required Names: `chatgpt.webp`, etc.
    *   Size: 32x32px.
20. **Static Pinned Program Icons (Start Menu Right Panel - Unique)**
    *   Paths: `./assets/gui/start-menu/email.webp`, `my-computer.webp`, `my-documents.webp`, `control-panel.webp`, `help.webp`, `search.webp`, `run.webp` (from `startMenu.js`)
    *   Required Names: `email.webp`, etc.
    *   Size: 25x25px.
21. **Log Off Icon (Start Menu Footer)**
    *   Path: `./assets/gui/start-menu/logoff.webp` (from `startMenu.js`)
    *   Required Name: `logoff.webp`
    *   Size: 24x24px.
22. **"All Programs" Button Arrow (Start Menu)**
    *   Path: `./assets/gui/start-menu/arrow.webp` (from `startMenu.js`)
    *   Required Name: `arrow.webp`
    *   Size: 16x16px.

### System Tray

23. **Welcome Tray Icon**
    *   Path: `./assets/gui/taskbar/welcome.webp` (from `index.html`)
    *   Required Name: `welcome.webp`
    *   Size: 16x16px.
24. **Fullscreen Tray Icon**
    *   Path: `./assets/gui/taskbar/fullscreen.webp` (from `index.html`)
    *   Required Name: `fullscreen.webp`
    *   Size: 16x16px.

### Application Toolbar Icons (General)

25. **Various Toolbar Icons**
    *   Paths: `./assets/gui/toolbar/*.webp` (e.g., `barlogo.webp`, `attach.webp`, `back.webp`, `forward.webp`, `home.webp`, `print.webp`, `views.webp`, `zoomin.webp`, `zoomout.webp`, `desc.webp` etc. as listed in `boot.js` preload and used in `programRegistry.js`)
    *   Required Names: `barlogo.webp`, `attach.webp`, `back.webp`, etc. (20+ icons)
    *   Size: Typically 16x16px (per `.toolbar-button img` style).

### About App Specific UI Icons

26. **Card Header Toggle Icons (Pullup/Pulldown)**
    *   Path: `../../../assets/apps/about/pullup-alt.webp` (from `about.html`, swapped in `about.js`)
    *   Required Name: `pullup-alt.webp`
    *   Size: 13x13px (CSS for `.left-panel__card__header__img`)
27. **Card Header Toggle Icons (Pullup/Pulldown)**
    *   Path: `../../../assets/apps/about/pullup.webp` (from `about.html`, swapped in `about.js`)
    *   Required Name: `pullup.webp`
    *   Size: 13x13px

### Projects App Specific UI Icons

28. **Video Mute/Unmute Icons**
    *   Paths: `../../../assets/apps/projects/voldown.webp`, `../../../assets/apps/projects/volup.webp` (dynamically in `projects.js`)
    *   Required Names: `voldown.webp`, `volup.webp`
    *   Size: Max 44x44px (mobile), 28x28px (desktop).

## Content Media

### Projects App Media

29. **Project Images (Grid & Lightbox)**
    *   Paths: `../../../assets/apps/projects/image1.webp` to `image6.webp`, `image7.webp` (from `projects.html` `data-src` and `<img> src`)
    *   Required Names: `image1.webp`, `image2.webp`, `image3.webp`, `image4.webp`, `image5.webp`, `image6.webp`, `image7.webp`
    *   Size: Grid: Responsive width (max 320px), auto height. Lightbox: Responsive, contained within viewport (e.g., `90vw/90vh`).
30. **Project Image Low-Res Placeholders (Optional/Unused)**
    *   Paths: `../../../assets/apps/projects/image1_low.webp`, `image7_low.webp` (from `projects.html` `data-lowres`)
    *   Required Names: `image1_low.webp`, `image7_low.webp`
    *   Size: Intended smaller versions, not directly rendered by default.
31. **Project Video Thumbnails (Grid Display)**
    *   Paths: `../../../assets/apps/projects/videothumb1.mp4` to `videothumb3.mp4` (from `projects.html` `<video src>`)
    *   Required Names: `videothumb1.mp4`, `videothumb2.mp4`, `videothumb3.mp4`
    *   Size: Grid: Responsive width (max 320px), 9/16 aspect ratio.
32. **Project Videos (Full - Lightbox Display)**
    *   Paths: `../../../assets/apps/projects/video1.mp4` to `video3.mp4` (from `projects.html` `data-src`)
    *   Required Names: `video1.mp4`, `video2.mp4`, `video3.mp4`
    *   Size: Lightbox: Responsive, contained within viewport.
33. **Project Video Posters (Grid & Lightbox)**
    *   Paths: `../../../assets/apps/projects/videoposter1.webp` to `videoposter3.webp` (from `projects.html` `<video poster>` and `data-poster`)
    *   Required Names: `videoposter1.webp`, `videoposter2.webp`, `videoposter3.webp`
    *   Size: Matches video dimensions in grid/lightbox.

### Resume App Document

34. **Resume Image (Main Content)**
    *   Path: `../../../assets/apps/resume/resume.webp` (from `resume.html`)
    *   Required Name: `resume.webp`
    *   Size: Responsive, can be zoomed up to 850px width or 160%.
35. **Resume PDF (Preloaded)**
    *   Path: `./assets/apps/resume/resumeMitchIvin.pdf` (from `boot.js` preload)
    *   Required Name: `resumeMitchIvin.pdf`
    *   Size: N/A (Document).

## Sound Effects

36. **Login Sound**
    *   Path: `./assets/sounds/login.wav` (from `boot.js`)
    *   Required Name: `login.wav`
    *   Size: N/A (Audio).
37. **Logoff Sound**
    *   Path: `./assets/sounds/logoff.wav` (from `boot.js`)
    *   Required Name: `logoff.wav`
    *   Size: N/A (Audio).

## Fonts (External)

38. **Wix Madefor Display**
    *   Path: Google Fonts URL (from `projects.html`)
    *   Required Name: `Wix Madefor Display`
    *   Size: Various weights used for different text elements (e.g., 1rem, 1.8rem, 2rem).
39. **Work Sans**
    *   Path: Google Fonts URL (from `projects.html`)
    *   Required Name: `Work Sans`
    *   Size: Various weights used (e.g., 0.9rem, 1.8rem).

*This list is based on analysis of the provided file structure and content. Some assets might be referenced in ways not captured (e.g., complex dynamic generation not matching simple string literals), or their display size might vary further based on specific CSS or JS interactions not fully detailed here.* 