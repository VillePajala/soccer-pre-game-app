# Soccer Pre-Game Tactics App

A sleek, modern web application built with Next.js and Tailwind CSS for soccer coaches to visualize player positioning, opponent formations, and tactical movements on a virtual field. Optimized for quick use on mobile, tablet, or desktop.

**Live Demo:** [https://soccer-pre-game-2slu7n1gt-ville-pajalas-projects.vercel.app/](https://soccer-pre-game-2slu7n1gt-ville-pajalas-projects.vercel.app/)

## Overview

This app provides an intuitive, responsive interface for coaches to explain formations, player roles, and strategies. Drag players and opponents, draw movement paths, and use the integrated game timer with substitution assistance.

## Features

*   **Virtual Soccer Field:** A clear, non-distorting view of a soccer pitch with standard markings.
*   **Player Management:** Add player disks from the top bar, assign names (renameable via click), and drag them onto the field.
*   **Opponent Markers:** Add, drag, and remove distinct opponent markers.
*   **Drag & Drop Positioning:** Easily place and reposition players and opponents.
*   **Tactical Drawing:** Use freehand drawing (distinct color) to illustrate movement paths, zones, or plays.
*   **Toggle Name Visibility:** Show or hide player names on the disks.
*   **Undo/Redo:** Step back and forth through all significant actions.
*   **Reset/Clear:** Reset the entire field or clear only drawings.
*   **Game Timer & Substitution Assist:** 
    *   Integrated timer with start/pause/reset.
    *   Optional large timer overlay.
    *   Configurable substitution interval alerts (warning/due colors).
    *   History log of actual lineup durations.
*   **Responsive & Fixed Layout:** Optimized for various screen sizes with a non-scrolling interface.
*   **Polished Dark Theme:** Professional dark UI with glassmorphism effects and clear visual hierarchy.
*   **Local Storage Persistence:** The entire application state is automatically saved in the browser.

## Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/) (React)
*   **Rendering:** HTML5 Canvas API
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **State Management:** React Hooks (`useState`, `useReducer`)
*   **Persistence:** Browser `localStorage`

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Future Enhancements

*   Saving and loading specific named formations/setups.
*   Exporting the current field view as an image.
*   Advanced touch interaction refinement.
*   Code cleanup (e.g., shared utilities).
*   Further accessibility improvements.

## Learn More (About Next.js)

To learn more about Next.js, take a look at the following resources:

*   [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
*   [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
