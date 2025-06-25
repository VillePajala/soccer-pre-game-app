# UI/UX Style Guide

This document outlines the design system and styling conventions for the Soccer Pre-Game App to ensure a cohesive and professional user experience.

## 1. Color Palette

Our theme is built on a dark, professional "slate" palette with clear, functional colors for actions.

- **Backgrounds:**
  - **Modal Body:** `bg-slate-800`
  - **Internal "Cards"/Sections:** `bg-slate-900/50`
  - **Input Fields/Selects:** `bg-slate-700`

- **Text:**
  - **Primary Body Text:** `text-slate-100` or `text-slate-200`
  - **Secondary/Muted Text:** `text-slate-400`
  - **Accent/Title Text:** `text-yellow-400` or `text-amber-400`

- **Borders:**
  - **Modal/Card Borders:** `border-slate-700`
  - **Input Borders:** `border-slate-600`

- **Interactive Colors (Buttons, etc.):**
  - **Primary Action (Confirm, Save):** `bg-indigo-600`
  - **Secondary/Neutral Action (Cancel, Close):** `bg-slate-600` or `bg-slate-700`
  - **Destructive Action (Delete, Reset):** `bg-red-600`
  - **Special Action (Tactics, etc.):** `bg-purple-600` (for home) & `bg-red-600` (for opponent)

- **Focus Rings:** A consistent `focus:ring-indigo-500` for all interactive elements to ensure accessibility.

## 2. Typography

We will use a single, consistent font across the application to create a unified feel.

- **Primary Font:** **Rajdhani**
  - *Implementation Note:* This will need to be imported in `layout.tsx` (e.g., from Google Fonts) and applied as the base font in `globals.css` or the main layout component.

- **Font Sizes & Weights:**
  - **Modal Titles:** `text-xl font-bold` (Color: Accent)
  - **Section Headings:** `text-lg font-semibold` (Color: Primary Body)
  - **Form Labels:** `text-sm font-medium` (Color: Secondary/Muted)
  - **Body Text:** `text-base` (Color: Primary Body)
  - **Input Text:** `text-sm` (Color: Primary Body)
  - **Button Text:** `text-sm font-medium`

## 3. Component Styles

Standardized components are the key to a consistent UI.

### 3.1 Buttons
- **Base Style:** `px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800`
- **Variations:**
  - **Primary:** `bg-indigo-600 text-white hover:bg-indigo-700`
  - **Secondary:** `bg-slate-600 text-slate-200 hover:bg-slate-500`
  - **Destructive:** `bg-red-600 text-white hover:bg-red-700`
- **Disabled State:** `disabled:opacity-50 disabled:cursor-not-allowed` for all buttons.

### 3.2 Forms (Inputs, Selects, Textareas)
- **Base Style:** `block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 sm:text-sm text-white`

### 3.3 Modals
- **Standard Layout:**
  - **Header:** A flex container with the title on the left and a close button (`<FaTimes />`) on the right. A `border-b border-slate-700` provides separation.
  - **Body:** Contains the main content, uses padding (`p-4` or `p-6`).
  - **Footer:** A flex container with `justify-end` for action buttons. Separated by a `border-t border-slate-700`.

## 4. Spacing & Layout
- **Gaps:** Use consistent `gap-x-4` and `gap-y-2` (or similar) for grid and flexbox layouts.
- **Padding:** Use consistent padding within containers (e.g., `p-4`) to maintain visual rhythm.
- **Responsiveness:** Ensure layouts are usable on smaller screens by using flexbox wrapping and responsive grid columns (`grid-cols-1 md:grid-cols-2`). 