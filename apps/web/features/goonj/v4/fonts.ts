import localFont from "next/font/local";

// General Sans (display, used light against semibold for the headline
// contrast) and Switzer (reading). Both from Fontshare, self-hosted.

export const generalSans = localFont({
  src: [
    { path: "../fonts/general-sans-200.woff2", weight: "200" },
    { path: "../fonts/general-sans-300.woff2", weight: "300" },
    { path: "../fonts/general-sans-400.woff2", weight: "400" },
    { path: "../fonts/general-sans-500.woff2", weight: "500" },
    { path: "../fonts/general-sans-600.woff2", weight: "600" },
  ],
  variable: "--font-general",
  display: "swap",
});

export const switzer = localFont({
  src: [
    { path: "../fonts/switzer-400.woff2", weight: "400" },
    { path: "../fonts/switzer-500.woff2", weight: "500" },
    { path: "../fonts/switzer-600.woff2", weight: "600" },
  ],
  variable: "--font-switzer",
  display: "swap",
});
