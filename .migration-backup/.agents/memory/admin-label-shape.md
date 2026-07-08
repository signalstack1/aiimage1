---
name: Admin entity label shape
description: The correct shape for admin entity labels in APP_CONFIG, and TypeScript pitfall when indexing adminModules dynamically.
---

## Rule
`APP_CONFIG.admin` entities use `{ singular: string; plural: string }` — NOT a single string.
- `plural` → section heading, nav label, count copy ("3 Products Live")
- `singular` → button copy, toast, confirm dialog ("New product", "Product created", "Delete this product?")

## Current shape (app.ts)
```ts
admin: {
  products:  { singular: "Product",     plural: "Products" },
  customers: { singular: "Customer",    plural: "Customers" },
  access:    { singular: "Access Link", plural: "Access" },
}
```

## TypeScript pitfall — indexing adminModules dynamically
`adminModules` is a specific object type (not `Record<string, boolean>`).
If you store the module key as a `string` and then do `modules[key]`, TypeScript errors.

**Fix:** use `as const` on string literals in the array so TypeScript infers the union type:
```ts
const kpis = [
  { module: "products" as const, ... },
  { module: "analytics" as const, ... },
].filter((k) => modules[k.module] !== false)   // ✅ type-safe
 .map(({ module: _m, ...rest }) => rest);       // strip key before spreading into component
```

**Why:** Without `as const`, TypeScript widens `"products"` to `string`, which is not a valid key of the specific adminModules object type.
