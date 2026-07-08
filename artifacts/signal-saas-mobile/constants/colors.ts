/**
 * Semantic design tokens for the mobile app.
 *
 * Ported 1:1 from the sibling web artifact's dark navy/cyan fintech theme
 * (artifacts/signal-saas/src/index.css) so both artifacts share the same
 * visual identity. SignalStack is dark-only by design, so the "light" key
 * below holds the dark palette and is used regardless of system scheme.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: "#f1f5f9",
    tint: "#0da2e7",

    // Core surfaces
    background: "#101318",
    foreground: "#f1f5f9",

    // Cards / elevated surfaces
    card: "#161a22",
    cardForeground: "#f1f5f9",

    // Primary action color (buttons, links, active states)
    primary: "#0da2e7",
    primaryForeground: "#101318",

    // Secondary / less-emphasis interactive surfaces
    secondary: "#1d212b",
    secondaryForeground: "#f1f5f9",

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: "#1b1f28",
    mutedForeground: "#7a899f",

    // Accent highlights (badges, selected items, focus rings)
    accent: "#212631",
    accentForeground: "#f1f5f9",

    // Destructive actions (delete, error states)
    destructive: "#ef4343",
    destructiveForeground: "#fafafa",

    // Borders and input outlines
    border: "#252c37",
    input: "#2d3643",
  },

  // Border radius (in px). Synced from the web artifact's --radius: 0.5rem.
  radius: 8,
};

export default colors;
