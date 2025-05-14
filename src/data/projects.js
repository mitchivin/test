// projects.js — Data for the Projects app
// This file contains all the projects shown in the Projects window.
// Each project is an object in the array below. You can add, remove, or edit projects here.

// PROJECTS ARRAY
// Each object represents a project. The 'type' can be 'image' or 'video'.
// 'src' is the main image or video file. 'lowres' is a lower-quality image for loading (optional).
// 'poster' is a preview image for videos. 'title' is the project title. 'description' is the text shown for the project.
export const projects = [
  // Example image project:
  // {
  //   type: "image", // 'image' or 'video'
  //   src: "../../../assets/apps/projects/image1.webp", // Main image or video file
  //   lowres: "../../../assets/apps/projects/image1_low.webp", // (Optional) Low-res image for loading
  //   title: "Project Title", // Title of the project
  //   description: "Description of the project." // Main text shown for the project
  // },
  {
    type: "image",
    src: "../../../assets/apps/projects/image1.webp",
    lowres: "../../../assets/apps/projects/image1_low.webp",
    title: "Mavs Win",
    description: "A social-ready final score card featuring Luka Dončić and the team after their win. The design uses a strong, center-aligned layout, a clear type hierarchy, and team-specific colors. It blends the look of an NBA broadcast with a fresh, digital-first style."
  },
  {
    type: "image",
    src: "../../../assets/apps/projects/carousel1.webp",
    lowres: "../../../assets/apps/projects/carousel1_low.webp",
    title: "All Blacks Final Score",
    description: "Created to capture the moment of victory, this piece uses a dynamic top-down composition and lets the players' body language tell the story. The final scores are integrated into the turf, grounding the narrative in the game itself. The result is a clean, editorial approach to rugby storytelling."
  },
  {
    type: "video",
    src: "../../../assets/apps/projects/video1.mp4",
    poster: "../../../assets/apps/projects/videoposter1.webp",
    title: "Sua'ali'i Switch Up",
    description: "A dynamic recap of Joseph Sua'ali'i's debut tour with the Wallabies after his high-profile switch from rugby league to union. The video captures his transition, early impact, and standout plays, blending on-field action with behind-the-scenes moments to showcase his journey in the gold jersey."
  },
  {
    type: "image",
    src: "../../../assets/apps/projects/image2.webp",
    title: "Mahomes Dominance",
    description: "A bold hype poster that highlights Mahomes' explosive leadership and technical skill. The design features vibrant red and yellow gradients, layered cutouts, and motion effects to reflect his energy on the field. It's made to stand out on social media."
  },
  {
    type: "video",
    src: "../../../assets/apps/projects/video2.mp4",
    poster: "../../../assets/apps/projects/videoposter2.webp",
    title: "FLASHback",
    description: "A fast-paced highlight reel celebrating Dwyane Wade's most electrifying moments. This edit brings together his signature moves, clutch plays, and iconic celebrations, all set to a retro-inspired visual style that nods to his era. Perfect for fans who want to relive Wade's greatness in a fresh, energetic way."
  },
  {
    type: "image",
    src: "../../../assets/apps/projects/image3.webp",
    title: "Minnesota Duo",
    description: "A high-contrast composite that brings together basketball and football stars from Minnesota in a surreal, snowy city scene. Cool tones and sharp overlays give both athletes a unified visual identity, while the title brings local pride and attitude."
  },
  {
    type: "video",
    src: "../../../assets/apps/projects/video3.mp4",
    poster: "../../../assets/apps/projects/videoposter3.webp",
    title: "Saquon Snow Day",
    description: "A cinematic highlight package from the Eagles' snowy playoff clash with the Rams, featuring Saquon Barkley's unforgettable 78-yard touchdown run. The edit combines dramatic slow-motion, field-level shots, and crowd reactions to capture the energy and excitement of a game that became an instant classic."
  },
  {
    type: "image",
    src: "../../../assets/apps/projects/image4.webp",
    title: "Blues Starting XV",
    description: "A clean, neon-inspired Super Rugby lineup graphic for the Blues. Modern typefaces and color-coded sections distinguish starters from \"Game Changers.\" Bold portraits anchor the design, keeping the player list clear and easy to read."
  },
  {
    type: "image",
    src: "../../../assets/apps/projects/image5.webp",
    title: "Bryant Tribute",
    description: "A concept-driven tribute that imagines Kobe walking into the clouds, with a dragon behind him and a snake in hand—a nod to his nickname. The artwork combines fantasy realism with soft lighting and painterly clouds for a powerful farewell."
  },
  {
    type: "image",
    src: "../../../assets/apps/projects/image6.webp",
    title: "Barkley Big Head",
    description: "A playful, caricature-style piece that exaggerates Saquon's head for a fun, eye-catching effect. The jersey and field remain photo-realistic, while the oversized head adds humor. A printed-texture filter gives it the nostalgic feel of a classic NFL trading card."
  }
]; 