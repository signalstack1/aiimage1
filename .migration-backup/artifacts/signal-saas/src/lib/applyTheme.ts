import { APP_CONFIG } from "@/config/app";

/**
 * Reads APP_CONFIG.primaryColor and injects it as a CSS variable override
 * on <html>. Call once at app startup (in main.tsx).
 *
 * If primaryColor is null the default from index.css is kept unchanged.
 */
export function applyTheme() {
  const color = APP_CONFIG.primaryColor;
  if (!color) return;
  document.documentElement.style.setProperty("--primary", color);
  document.documentElement.style.setProperty("--ring", color);
}
