---
name: Tailwind v4 dark mode — no @apply dark
description: In Tailwind v4, the dark variant is not a utility class and cannot be used with @apply.
---

**Rule:** In Tailwind v4, `@apply dark` in CSS throws `Cannot apply unknown utility class 'dark'`. Instead, add the class to the HTML element via JavaScript.

```ts
// main.tsx or entry point
document.documentElement.classList.add("dark");
```

**Why:** Tailwind v4 `dark` is a variant selector, not a utility class. `@apply` only works with utility classes.

**How to apply:** Whenever a dark-only theme is needed in a Tailwind v4 project, set the class in the JS entry point rather than CSS.
