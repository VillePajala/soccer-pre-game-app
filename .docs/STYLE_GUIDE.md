# UI/UX Style Guide

This document outlines the design system and styling conventions for the Soccer Pre-Game App to ensure a cohesive and professional user experience.

## 1. Color Palette & Effects

Our theme combines deep, professional slate backgrounds with subtle gradients and modern blur effects for depth.

- **Backgrounds:**
  - **Modal Base:** `bg-slate-800` with `bg-noise-texture`
  - **Gradient Overlays:** 
    - Subtle top gradient: `bg-gradient-to-b from-sky-400/10 via-transparent to-transparent`
    - Background tint: `bg-indigo-600/10 mix-blend-soft-light`
  - **Section Backgrounds:** `bg-slate-900/80` to `bg-slate-800/80` with gradient
  - **Interactive Areas:** `bg-slate-800/40` with hover `bg-slate-800/60`

- **Text:**
  - **Primary Headers:** `text-yellow-400` with `tracking-wide` and `drop-shadow-lg`
  - **Body Text:** `text-slate-100`
  - **Secondary Text:** `text-slate-400`

- **Borders & Dividers:**
  - **Subtle Borders:** `border-slate-700/20` with `backdrop-blur-sm`
  - **Interactive Borders:** `border-slate-700/50`
  - **Focus Borders:** `border-indigo-500`

- **Effects & Overlays:**
  - **Backdrop Blur:** `backdrop-blur-sm` for layered elements
  - **Shadows:** `shadow-inner` for depth, `drop-shadow-lg` for emphasis
  - **Noise Texture:** Applied via `bg-noise-texture` for subtle grain
  - **Glow Effects:** Using absolute positioning and blur

## 2. Layout & Spacing

- **Modal Structure:**
  - Full-screen approach with no padding
  - Three-part vertical layout: header, scrollable content, footer
  - Content sections use consistent horizontal padding (`px-4`)
  - Vertical spacing between sections: `space-y-6`

- **Header Treatment:**
  - Generous vertical padding (`py-8`)
  - Centered text with increased size (`text-3xl`)
  - No border, uses backdrop blur instead

- **Content Organization:**
  - Card-like sections with gradient backgrounds
  - Consistent horizontal padding
  - Compact but readable spacing (`space-y-1.5` for lists)

## 3. Interactive Elements

### 3.1 Buttons
- **Base Style:** `px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800`
- **Primary Action:** 
  ```css
  bg-gradient-to-b from-indigo-500 to-indigo-600 
  hover:from-indigo-600 hover:to-indigo-700 
  shadow-lg
  ```
- **Secondary Action:**
  ```css
  bg-gradient-to-b from-slate-600 to-slate-700 
  hover:from-slate-700 hover:to-slate-600
  ```

### 3.2 Interactive Areas
- **Hover States:** Smooth transitions with `transition-colors`
- **Focus States:** Clear indicators with ring focus
- **Disabled States:** `disabled:opacity-50 disabled:cursor-not-allowed`

### 3.3 Forms & Inputs
- **Text Inputs:** 
  ```css
  bg-slate-700 border border-slate-600 
  rounded-md shadow-sm py-2 px-3
  focus:ring-2 focus:ring-indigo-500
  ```
- **Size Variations:**
  - Regular: `text-base`
  - Large (e.g., team name): `text-lg`

## 4. Typography

- **Font Family:** Rajdhani for the entire application
- **Size Hierarchy:**
  - Modal Titles: `text-3xl font-bold tracking-wide`
  - Section Headers: `text-xl font-semibold`
  - Regular Text: `text-base`
  - Secondary Text: `text-sm`

## 5. Component Patterns

### 5.1 Modal Pattern
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

## 6. Responsive Design
- Full-screen modals on mobile
- Consistent padding and spacing across devices
- Touch-friendly tap targets
- Proper overflow handling for various screen sizes

## 7. Animation & Transitions
- Smooth hover transitions
- Subtle background effects
- Performance-conscious blur effects
- Consistent timing functions

## 8. Accessibility
- Clear focus indicators
- Sufficient color contrast
- Proper ARIA attributes
- Keyboard navigation support

## 9. Internationalization (i18n)
All user-facing text must be internationalized using the `react-i18next` library.
- **Implementation:** Use the `t()` function for all static strings (labels, titles, buttons, placeholders, etc.).
- **Keys:** Follow a namespaced key structure (e.g., `modalName.component.keyName`) for clarity.
- **Reference:** For a detailed example and best practices, refer to the `@translation-bugfix.md` document. 