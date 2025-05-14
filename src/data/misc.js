// misc.js — Miscellaneous Data for the Portfolio
// This file contains global settings and links used throughout the portfolio.
// You can change wallpapers, social links, and the welcome balloon text here.

// The desktop wallpaper image for desktop screens.
export const wallpaperDesktop = "./assets/gui/desktop/bliss.jpg";
// The desktop wallpaper image for mobile screens.
export const wallpaperMobile = "./assets/gui/desktop/blissMobile.jpg";

// SOCIAL LINKS
// These are your main social media/profile links used in the Start Menu, Contact Me toolbar, and About Me left card.
// Change the URLs to your own profiles.
export const socialLinks = {
  instagram: "https://www.instagram.com/mitchivin", // Instagram profile URL
  behance: "https://www.behance.net/mitch_ivin",   // Behance profile URL
  github: "https://github.com/mitchivin",          // GitHub profile URL
  linkedin: "https://www.linkedin.com/in/mitchivin" // LinkedIn profile URL
};

// SOCIAL LINKS FOR ABOUT ME LEFT CARD
// This array controls the order, icon, and label for the social links in the About Me app's left card.
// 'key' must match a key in socialLinks above. 'icon' is the image shown. 'label' is the text shown.
export const socialLinksAbout = [
  { key: 'instagram', icon: '../../../assets/gui/start-menu/instagram.webp', label: 'Instagram' },
  { key: 'linkedin', icon: '../../../assets/gui/start-menu/linkedin.webp', label: 'LinkedIn' },
  { key: 'behance', icon: '../../../assets/gui/start-menu/behance.webp', label: 'Behance' },
  { key: 'github', icon: '../../../assets/gui/start-menu/github.webp', label: 'Github' }
];

// BALLOON WELCOME TOOLTIP
// These control the header and text for the welcome balloon that appears when you click the network icon in the taskbar.
export const balloonWelcomeHeader = "Welcome"; // The main heading in the balloon
export const balloonWelcomeText = "Hey, I'm Mitch, I'm a designer. Welcome to my portfolio.<br>It doesn't follow the usual format, because neither do i."; // The main text (can use <br> for line breaks) 