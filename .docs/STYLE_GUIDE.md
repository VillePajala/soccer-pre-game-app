# UI/UX Style Guide

This document outlines the design system and styling conventions for the Soccer Pre-Game App to ensure a cohesive and professional user experience.

## 1. Color Palette & Effects

Our theme combines deep, professional slate backgrounds with subtle gradients and modern blur effects for depth.

- **Backgrounds:**
  - **Modal Base:** `bg-slate-800` with `bg-noise-texture`
  - **Gradient Overlays:** 
    - Subtle top gradient: `bg-gradient-to-b from-sky-400/10 via-transparent to-transparent`
    - Background tint: `bg-indigo-600/10 mix-blend-soft-light`
    - Glow effects: `bg-sky-400/5 blur-2xl opacity-50` and `bg-indigo-600/5 blur-2xl opacity-50`
  - **Section Backgrounds:** `bg-slate-900/80` to `bg-slate-800/80` with gradient
  - **Interactive Areas:** `bg-slate-800/40` with hover `bg-slate-800/60`
  - **List Items:** `bg-slate-800/40 border-slate-700/50` with hover `bg-slate-800/60`

- **Text:**
  - **Primary Headers:** `text-yellow-400` with `tracking-wide` and `drop-shadow-lg`
  - **Body Text:** `text-slate-100`
  - **Secondary Text:** `text-slate-400`
  - **Stats Numbers:** `text-yellow-400 font-semibold`

- **Borders & Dividers:**
  - **Subtle Borders:** `border-slate-700/20` with `backdrop-blur-sm`
  - **Interactive Borders:** `border-slate-700/50`
  - **Focus Borders:** `border-indigo-500`
  - **List Item Borders:** `border border-slate-700/50`

- **Effects & Overlays:**
  - **Backdrop Blur:** `backdrop-blur-sm` for layered elements
  - **Shadows:** `shadow-inner` for depth, `drop-shadow-lg` for emphasis
  - **Noise Texture:** Applied via `bg-noise-texture` for subtle grain
  - **Glow Effects:** Using absolute positioning and blur

## 2. Layout & Spacing

- **Modal Structure:**
  - Full-screen approach with no padding
  - Three main sections:
    1. Fixed header with title (`pt-10 pb-4`)
    2. Fixed controls section with stats and primary actions
    3. Scrollable content area
  - Content sections use consistent horizontal padding (`px-6` for controls, `px-4` for content)
  - Vertical spacing varies by section:
    - List items: `space-y-1.5`
    - Major sections: `space-y-4` or `space-y-5`

- **Grid Layouts:**
  - Two-column layouts: `grid-cols-[60%_40%]` for balanced content
  - Form layouts: `grid-cols-1 sm:grid-cols-2 gap-3`

## 3. Interactive Elements

### 3.1 Buttons
- **Primary Action Button:** 
  ```css
  bg-indigo-600 hover:bg-indigo-700
  w-full px-4 py-2 rounded-md
  ```
- **Icon Buttons:**
  ```css
  p-1.5 rounded-md transition-colors
  text-slate-400 hover:text-indigo-400
  disabled:opacity-50 disabled:cursor-not-allowed
  ```
- **Delete Actions:** `hover:text-red-500`

### 3.2 Form Controls
- **Checkboxes:**
  ```css
  form-checkbox h-5 w-5
  text-indigo-600 bg-slate-600
  border-slate-500 rounded
  focus:ring-indigo-500
  ```

## 4. List Items
- **Container:**
  ```css
  p-2 rounded-md border
  bg-slate-800/40 border-slate-700/50
  hover:bg-slate-800/60 transition-colors
  ```
- **Active State:**
  ```css
  bg-slate-700/75 border-indigo-500
  ```

## 5. Fixed vs Scrollable Content
- **Fixed Sections:**
  - Use `backdrop-blur-sm bg-slate-900/20`
  - Contain critical UI elements and primary actions
- **Scrollable Content:**
  - Use `flex-1 overflow-y-auto min-h-0`
  - Contains list items and secondary content

## 6. Typography

- **Font Family:** Rajdhani for the entire application
- **Size Hierarchy:**
  - Modal Titles: `text-3xl font-bold tracking-wide`
  - Section Headers: `text-xl font-semibold`
  - Regular Text: `text-base`
  - Secondary Text: `text-sm`

## 7. Component Patterns

### 7.1 Modal Pattern
```css
// Container
.modal-container {
  @apply fixed inset-0 bg-black bg-opacity-70 
         flex items-center justify-center z-[60] font-display;
}

// Content
.modal-content {
  @apply bg-slate-800 flex flex-col h-full w-full
         bg-noise-texture relative overflow-hidden;
}

// Header
.modal-header {
  @apply flex justify-center items-center py-8
         backdrop-blur-sm bg-slate-900/20;
}

// Body
.modal-body {
  @apply flex-1 overflow-y-auto min-h-0 space-y-6
         backdrop-blur-sm bg-slate-900/20;
}

// Footer
.modal-footer {
  @apply p-4 border-t border-slate-700/20
         backdrop-blur-sm bg-slate-900/20;
}
```

## 8. Responsive Design
- Full-screen modals on mobile
- Consistent padding and spacing across devices
- Touch-friendly tap targets
- Proper overflow handling for various screen sizes

## 9. Animation & Transitions
- Smooth hover transitions
- Subtle background effects
- Performance-conscious blur effects
- Consistent timing functions

## 10. Accessibility
- Clear focus indicators
- Sufficient color contrast
- Proper ARIA attributes
- Keyboard navigation support

## 11. Internationalization (i18n)
All user-facing text must be internationalized using the `react-i18next` library.
- **Implementation:** Use the `t()` function for all static strings (labels, titles, buttons, placeholders, etc.).
- **Keys:** Follow a namespaced key structure (e.g., `modalName.component.keyName`) for clarity.
- **Reference:** For a detailed example and best practices, refer to the `@translation-bugfix.md` document. 