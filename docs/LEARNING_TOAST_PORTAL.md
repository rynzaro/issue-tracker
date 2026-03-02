# Understanding & Fixing the Toast Provider (Portal Pattern)

> **Purpose**: Walk through how `toastProvider.tsx` works from the ground up, then understand _why_ toasts hide behind modals and _how_ to fix it with React portals.  
> **Delete this file** once you've applied the changes and feel confident with the concepts.

---

## Part 1: How the Toast Provider Works

### 1.1 The Context Pattern

The toast system uses React Context so **any component** in the app can trigger a notification without prop drilling.

```
┌─ ToastProvider (wraps the app) ──────────────┐
│                                               │
│   holds: toasts[] state, showToast function   │
│   provides: { showToast } via Context         │
│                                               │
│   ┌─ Any nested component ────────────┐       │
│   │  const { showToast } = useToast() │       │
│   │  showToast(<SuccessToast ... />)  │       │
│   └───────────────────────────────────┘       │
└───────────────────────────────────────────────┘
```

Three pieces make this work:

1. **`createContext`** — creates a "channel" (`ToastContext`)
2. **`ToastProvider`** — the component that holds state and wraps `children` in `<ToastContext.Provider value={{ showToast }}>`
3. **`useToast()`** — a hook that calls `useContext(ToastContext)` so any child component can call `showToast`

### 1.2 Toast State Management

```tsx
const [toasts, setToasts] = useState<ToastData[]>([]);
```

Each toast in the array is an object:

```ts
type ToastData = {
  id: string;       // random ID for keying in the list
  type: ToastType;  // "success" | "error" | "info" — determines icon & border color
  content: ReactNode; // the JSX passed to showToast (e.g. <SuccessToast title="Saved!" />)
  duration?: number;  // auto-dismiss time in ms (default 5000)
  show: boolean;      // controls the Transition animation (true = visible, false = exiting)
};
```

### 1.3 Toast Lifecycle

Here's the full lifecycle of a single toast:

```
showToast() called
       │
       ▼
  Create toast object (id, type, content, show: true)
       │
       ▼
  Add to toasts[] state  ──or──  Replace all toasts (if replace=true)
       │
       ▼
  Toast renders → HeadlessUI <Transition show={true}> → enter animation plays
       │
       ▼
  setTimeout(removeToast, duration)  (skipped if duration === Infinity)
       │
       ▼
  removeToast(id) called
       │
       ├── Step 1: set show=false → triggers <Transition> exit animation
       │
       └── Step 2: setTimeout 200ms → remove toast from array entirely
```

**Why two steps for removal?** If you remove the toast from the array immediately, React unmounts it and the exit animation never plays. By setting `show: false` first, HeadlessUI's `<Transition>` animates out, and _then_ we clean up the DOM after 200ms.

### 1.4 Type Detection via `getToastType`

```tsx
function getToastType(content: ReactNode): ToastType {
  if (typeof content === "object" && content !== null && "type" in content) {
    const element = content as ReactElement;
    if (element.type === SuccessToast) return "success";
    if (element.type === ErrorToast) return "error";
    if (element.type === InfoToast) return "info";
  }
  return "info";
}
```

This inspects the React element you pass to `showToast`. When you write:

```tsx
showToast(<SuccessToast title="Gespeichert!" />)
```

React creates an element object where `.type` is the `SuccessToast` function reference. `getToastType` checks that reference to determine the toast type, which controls the icon and border color. If you pass plain text or an unknown component, it defaults to `"info"`.

### 1.5 The Rendering

The toast container is a `position: fixed` overlay covering the viewport, pinned to the top-right:

```tsx
<div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-end ...">
```

- `pointer-events-none` — the overlay doesn't block clicks on the page
- `fixed inset-0` — covers the full viewport
- `z-50` — tries to sit on top of other content
- `flex items-start justify-end` — toasts stack from the top-right

Each toast is wrapped in HeadlessUI's `<Transition>` for enter/exit animations, and has `pointer-events-auto` so you _can_ click its dismiss button.

---

## Part 2: The Problem — Toasts Hidden Behind Modals

### 2.1 How HeadlessUI Dialog Uses Portals

When you render a `<Dialog>` from HeadlessUI, it doesn't place the modal HTML where you wrote the JSX. Instead, it uses a **React portal** to inject the dialog DOM nodes as **direct children of `<body>`**.

This is what the DOM actually looks like when a Dialog is open:

```
<body>
  ┌─ <div id="__next"> ──────────────────────┐
  │                                           │
  │   Your React app tree lives here          │
  │                                           │
  │   ┌─ ToastProvider ────────────────────┐  │
  │   │                                    │  │
  │   │   ┌─ toast container (z-50) ────┐  │  │
  │   │   │  🔔 Your toast notification │  │  │
  │   │   └─────────────────────────────┘  │  │
  │   └────────────────────────────────────┘  │
  │                                           │
  └───────────────────────────────────────────┘
  
  ┌─ Dialog Portal (direct child of <body>) ──┐
  │                                            │
  │   ┌─ Backdrop (covers everything) ──────┐  │
  │   │   semi-transparent dark overlay     │  │
  │   └────────────────────────────────────┘  │
  │   ┌─ Dialog Panel ─────────────────────┐  │
  │   │   modal content                    │  │
  │   └────────────────────────────────────┘  │
  │                                            │
  └────────────────────────────────────────────┘
</body>
```

### 2.2 What is a Stacking Context?

CSS `z-index` only works **within the same stacking context**. A stacking context is like a "layer group" — elements inside it are sorted by z-index relative to _each other_, but the entire group is positioned as a unit relative to sibling groups.

Key rule: **a child's z-index cannot escape its parent's stacking context**.

### 2.3 Why z-50 Isn't Enough

The toast container sits inside `#__next` (the React app root). The Dialog portal sits as a **sibling** of `#__next`, directly on `<body>`.

```
<body>
  <div id="__next">      ← stacking context A
    toast (z-50)          ← z-50 within context A
  </div>
  <div>                   ← Dialog portal (context B, comes AFTER A in DOM order)
    backdrop
    panel
  </div>
</body>
```

Since the Dialog portal comes **after** `#__next` in the DOM, it naturally paints on top. The toast's `z-50` only applies within its parent's stacking context — it can't compete with a sibling that the browser paints later.

**Result**: The dialog backdrop covers the toast. The toast is there, but invisible behind the modal.

---

## Part 3: The Fix — Step by Step

We need to **portal the toasts out** of the React tree so they sit **alongside** (or after) the Dialog portal in the DOM, with a very high z-index.

### Step 1: Add imports

Add `useEffect` to the React import and add `createPortal` from `react-dom`:

```diff
 import {
   createContext,
   useContext,
   useState,
   useCallback,
+  useEffect,
   type ReactNode,
   type ReactElement,
 } from "react";
+import { createPortal } from "react-dom";
```

**Why `useEffect`?** We need it for the SSR guard (see Step 2).  
**Why `createPortal`?** This is React's API for rendering a component's output into a _different_ DOM node than its parent.

### Step 2: Add the SSR guard

Inside `ToastProvider`, add a `mounted` state and a `useEffect`:

```diff
 export function ToastProvider({ children }: { children: ReactNode }) {
   const [toasts, setToasts] = useState<ToastData[]>([]);
+  const [mounted, setMounted] = useState(false);
+
+  useEffect(() => {
+    setMounted(true);
+  }, []);
```

**Why?** `createPortal` needs `document.body` — but during **server-side rendering** (SSR), the `document` object doesn't exist. Next.js renders components on the server first, then hydrates on the client.

If we called `createPortal(jsx, document.body)` unconditionally, the server render would crash with `ReferenceError: document is not defined`.

The fix: `useEffect` only runs on the **client** (never on the server). So `mounted` starts as `false` (server-safe), then flips to `true` on the first client render. We only call `createPortal` when `mounted === true`.

### Step 3: Extract the toast container into a variable

Instead of rendering the toast container inline in the JSX return, extract it:

```tsx
  const toastContainer = (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-99999 flex items-start justify-end px-4 py-6 sm:p-6"
    >
      <div className="flex w-full max-w-sm flex-col items-end space-y-3">
        {toasts.map((toast) => {
          return (
            <Transition key={toast.id} show={toast.show}>
              {/* ... same toast rendering as before ... */}
            </Transition>
          );
        })}
      </div>
    </div>
  );
```

This is the same JSX that was inline before — just stored in a variable so we can pass it to `createPortal`.

### Step 4: Render via `createPortal`

Replace the inline toast container in the return with a portal:

```diff
   return (
     <ToastContext.Provider value={{ showToast }}>
       {children}
-
-      <div
-        aria-live="assertive"
-        className="pointer-events-none fixed inset-0 z-50 ..."
-      >
-        {/* ...toast list... */}
-      </div>
+      {mounted ? createPortal(toastContainer, document.body) : null}
     </ToastContext.Provider>
   );
```

**What `createPortal` does**: It renders the `toastContainer` JSX not where this component sits in the React tree, but as a **direct child of `<body>`**. The React state, context, and event handling still work normally — only the DOM placement changes.

Now the DOM looks like:

```
<body>
  <div id="__next">         ← React app (no toast container here anymore)
  </div>
  <div>                      ← Dialog portal (HeadlessUI)
    backdrop + panel
  </div>
  <div aria-live="assertive" ← Toast portal (OUR new portal, comes LAST)
    class="... z-99999 ...">
    🔔 toast notifications
  </div>
</body>
```

### Step 5: Bump the z-index

Change `z-50` to `z-99999`:

```diff
- className="pointer-events-none fixed inset-0 z-50 flex items-start justify-end px-4 py-6 sm:p-6"
+ className="pointer-events-none fixed inset-0 z-99999 flex items-start justify-end px-4 py-6 sm:p-6"
```

**Why so high?** HeadlessUI doesn't set an explicit z-index on its Dialog portal — it relies on DOM order. But other libraries or custom styles might. Using `z-99999` ensures toasts always win, regardless of what other z-indices exist in the app.

> Note: In Tailwind CSS v4, `z-99999` is valid directly (no bracket syntax needed). In v3, you'd write `z-[99999]`.

---

## Part 4: The Complete Changed File

For reference, here's what the top of `toastProvider.tsx` looks like after all changes (only the parts that differ are shown; the toast content components `SuccessToast`, `ErrorToast`, `InfoToast` at the bottom are unchanged):

```tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,                    // ← ADDED
  type ReactNode,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";  // ← ADDED
import { Transition } from "@headlessui/react";
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { XMarkIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";

// ... types and getToastType unchanged ...

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [mounted, setMounted] = useState(false);  // ← ADDED

  useEffect(() => {                                // ← ADDED
    setMounted(true);                              // ← ADDED
  }, []);                                          // ← ADDED

  // ... removeToast and showToast unchanged ...

  const toastContainer = (                         // ← EXTRACTED into variable
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-99999 flex items-start justify-end px-4 py-6 sm:p-6"
    >                                              {/* ↑ z-50 → z-99999 */}
      {/* ... same toast list rendering ... */}
    </div>
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted ? createPortal(toastContainer, document.body) : null}
    </ToastContext.Provider>                        {/* ↑ PORTAL instead of inline */}
  );
}
```

---

## Key Takeaways

| Concept | One-liner |
|---|---|
| **React Context** | Share state (like `showToast`) across the component tree without prop drilling |
| **Stacking Context** | A z-index only competes with siblings in the same stacking context — children can't escape their parent |
| **React Portal** | `createPortal(jsx, domNode)` renders JSX into a different DOM location while keeping React state/context intact |
| **SSR Guard** | Use `useEffect` + a `mounted` flag to safely access `document` only on the client |
| **The fix** | Portal the toast container to `<body>` so it's a sibling of (not nested inside) the Dialog portal, with a high z-index |

---

## How to Apply

When you're ready, make these changes in order:

1. Add `useEffect` to the React import line
2. Add `import { createPortal } from "react-dom";` after the React import
3. Add `const [mounted, setMounted] = useState(false);` and the `useEffect` inside `ToastProvider`
4. Cut the `<div aria-live="assertive" ...>...</div>` block out of the `return` and assign it to `const toastContainer = (...)`
5. In the `return`, replace the cut block with `{mounted ? createPortal(toastContainer, document.body) : null}`
6. In `toastContainer`, change `z-50` to `z-99999`

That's it — 6 small changes, one concept (portals), and your toasts will always appear on top of everything.
