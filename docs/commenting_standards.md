# Codebase Commenting Standards

## 1. Overarching Philosophy

The primary goal of these commenting standards is to ensure the codebase is exceptionally clear and understandable, not just for human developers, but specifically for AI agents assisting with development and maintenance. Comments should illuminate the "why" behind the code, clarify complex logic, and provide context that might not be immediately obvious from the code itself. This facilitates more accurate and successful AI-assisted edits.

## 2. General Principles

- **Clarity over Brevity (within reason):** While conciseness is good, it should not come at the expense of clarity.
- **Comment the "Why", Not Just the "What":** The code itself often shows _what_ it's doing. Comments should explain _why_ that approach was taken, especially if there are non-obvious reasons or trade-offs.
- **Consistency:** Strive for a consistent commenting style across all files.
- **Keep Comments Up-to-Date:** If you change the code, update the comments. Outdated comments are worse than no comments.
- **English Language:** All comments should be in English.

## 3. File-Level Header Comments

Every file must begin with a header comment that provides:

1.  A brief description of the file's purpose and its role within the application/module.
2.  The `@file` tag followed by the full relative path to the file from the project root.

**Syntax:**

- **CSS Files (`.css`):**
  ```css
  /*
   * filename.css — Brief description of the CSS file's purpose.
   * Describes what styles this file is responsible for and how it fits into the overall styling.
   * @file path/to/your/filename.css
   */
  ```
- **JavaScript Files (`.js`):**
  ```javascript
  /*
   * filename.js — Brief description of the JavaScript file's purpose.
   * Outlines the main functionalities, interactions, or module responsibilities.
   * @file path/to/your/filename.js
   */
  ```
- **HTML Files (`.html`):**
  ```html
  <!--
    filename.html — Brief description of the HTML file's purpose.
    Details the structure this file provides, its main sections, and if it's a template for dynamic content.
    @file path/to/your/filename.html
  -->
  ```

## 4. Section Comments

Use section comments to break down files into logical parts. This helps in understanding the structure and navigating the code.

- **CSS:**

  ```css
  /* ===== Section Name ===== */
  /* Styles for X, Y, Z */

  /* --- Subsection Name --- */
  ```

- **JavaScript:**

  ```javascript
  // ===== Section Name =====
  // Logic related to A, B, C

  // --- Subsection Name ---
  ```

- **HTML:**

  ```html
  <!-- ===== Section Name ===== -->
  <!-- This section contains elements for X, Y, Z -->

  <!-- --- Subsection Name --- -->
  ```

## 5. Code-Specific Comments

### 5.1. CSS Comments

- **Selectors:**
  - For complex selectors, explain what element(s) they target and under what conditions.
  - If a selector has high specificity for a reason, note it.
  - `#example-id .complex-child > .direct-descendant + .adjacent-sibling { /* Comment explaining this specific targeting logic */ }`
- **Properties & Values:**
  - **"Magic Numbers":** Explain any non-obvious numerical values (e.g., specific `px` values for layout, `z-index` values, animation timings).
    - `z-index: 1001; /* Above main content (1000) but below modals (1010) */`
    - `transition-duration: 0.33s; /* Custom timing to match X animation feel */`
  - **Layout Logic:** Explain `position`, `display`, `flexbox`, `grid` properties if their usage is complex or critical for a specific layout.
    - `position: absolute; /* To position it relative to the nearest positioned ancestor for overlay effect */`
  - **`z-index` Stacking Context:** If `z-index` is used, comment on its relation to other `z-index` values and stacking contexts.
  - **Animations & Transitions:** Explain the purpose of the animation/transition and any non-obvious `cubic-bezier` functions or delays.
  - `animation: slideIn 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) forwards; /* Smooth slide-in from left */`
  - **Media Queries:** Briefly explain the purpose of the media query block and what layout changes it introduces.
    - `@media (max-width: 768px) { /* Styles for tablet and mobile: stack elements vertically */ }`
  - **Workarounds/Hacks:** If a style is a workaround for a browser bug or a specific rendering issue, clearly document it.

### 5.2. JavaScript Comments

- **JSDoc for Functions:** All functions, especially public/exported ones and complex private ones, should have JSDoc comments.
  - Include a brief description of what the function does.
  - Use `@param` for all parameters, specifying their type and a description.
  - Use `@returns` to specify the return type and a description of the return value (if any).
  - Use `@throws` if the function can throw specific errors.
  - \`\`\`javascript
    /\*\*
    - Calculates the sum of two numbers.
    - @param {number} a - The first number.
    - @param {number} b - The second number.
    - @returns {number} The sum of a and b.
      \*/
      function add(a, b) {
      return a + b;
      }
      \`\`\`
- **Variables & Constants:**
  - Comment complex or state-critical variables, especially global or module-scoped ones.
  - `let isLoading = false; // Tracks if data is currently being fetched`
- **Complex Logic:**
  - Explain intricate algorithms, conditional branches, or non-obvious logical flows.
  - Use comments before blocks of code or on preceding lines.
  - `// If the user is an admin and the record is active, then proceed...`
- **DOM Manipulations:** Explain why certain DOM elements are being selected or manipulated, especially if it's for a dynamic UI update.
  - `// Get the user profile element to update the name dynamically.`
- **Event Listeners:**
  - Explain the purpose of the event listener and what actions it triggers.
  - `// Handles clicks on the 'submit' button to send form data.`
  - `element.addEventListener('click', function() { /* ... */ });`
- **API Calls & Asynchronous Operations:**
  - Explain what data is being fetched/sent and what happens on success/failure.
  - `// Fetch user data from the /api/user endpoint.`
  - `fetch('/api/user').then(response => { /* Handle success: update UI */ }).catch(error => { /* Handle error: display message */ });`
- **State Management:** If the code manages UI or application state, comment on how state changes affect behavior.
- **Regular Expressions:** Provide a clear explanation of what the regex is trying to match.
  - `const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Matches a standard email format.`
- **Workarounds/Hacks:** Clearly document any code that is a workaround for a bug or an unusual requirement.

### 5.3. HTML Comments

- **Structural Sections:** Comment major sections of the HTML document (e.g., header, main content, sidebar, footer, forms).
  - `<!-- ===== Main Navigation Bar ===== -->`
- **Dynamic Content Placeholders:** If elements are populated dynamically by JavaScript, note this.
  - `<div id="user-profile"> <!-- User profile data loaded here by profile.js --> </div>`
- **Accessibility (ARIA):** If ARIA attributes are used for specific reasons that aren't self-evident, comment on their purpose.
  - `<div role="alert" aria-live="assertive"> <!-- Alerts screen readers immediately -->`
- **Complex Structures:** For deeply nested or unusually structured HTML, a comment explaining the rationale can be helpful.

## 6. Inline Comments

- Use inline comments sparingly. Prefer comments on the line(s) preceding the code.
- If used, they should be brief and explain a specific, non-obvious part of that line.
  - `const MAX_USERS = 100; // System limit for concurrent users`

## 7. TODOs and FIXMEs

- Use `// TODO:` for planned features or improvements.
- Use `// FIXME:` for known bugs that need fixing.
- Include a brief description of the task or issue.
  - `// TODO: Implement pagination for this list.`
  - `// FIXME: Calculation error when quantity is zero.`

By adhering to these standards, we aim to create a codebase that is not only robust and maintainable but also highly compatible with AI-assisted development tools, leading to faster and more reliable code modifications.
