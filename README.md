# Soccer Pre-Game Tactics App

A mobile-first web application built with Next.js for soccer coaches to quickly visualize player positioning and tactical strategies on a virtual field.

## Overview

This app provides an intuitive interface for coaches, especially those working with youth teams, to explain formations, player roles, and movement strategies directly on their phone or tablet. It's designed for quick, on-the-go use before matches.

## Features

*   **Virtual Soccer Field:** A clear, full-screen view of a soccer pitch.
*   **Player Management:** Add player disks, assign names (renameable), and drag them onto the field.
*   **Drag & Drop Positioning:** Easily place and reposition players anywhere on the field.
*   **Tactical Drawing:** Use freehand drawing to illustrate movement paths, zones, or plays directly on the field.
*   **Toggle Name Visibility:** Show or hide player names on the disks to reduce visual clutter.
*   **Undo/Redo:** Step back and forth through recent actions (player moves, opponent moves, drawings, adds/removes).
*   **Opponent Markers:** Add, drag, and remove simple opponent markers.
*   **Reset/Clear:** Reset the entire field or clear only drawings.
*   **Game Timer:** Integrated timer with start/pause/reset.
*   **Substitution Assist:** Optional large timer overlay with configurable substitution interval alerts (warning/due) and history of lineup durations.
*   **Responsive Design:** Optimized for mobile and tablet use, with desktop/web support.
*   **Local Storage Persistence:** The entire application state (players, opponents, drawings, history, timer settings) is saved in the browser.

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

*   Saving and loading specific formations/setups.
*   Exporting the current field view as an image.
*   Further styling improvements and accessibility considerations.

## Learn More (About Next.js)

To learn more about Next.js, take a look at the following resources:

*   [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
*   [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
