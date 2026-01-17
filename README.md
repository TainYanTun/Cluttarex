# Cluttarex

Distraction-free reading for the web.

## Project Structure

This is a monorepo managed with **Bun workspaces**:

- `apps/web`: Next.js 15 application (Web Proxy).
- `apps/extension`: Chrome Extension (Manifest V3) built with Vite.
- `packages/shared`: Shared TypeScript types and utilities.

## Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- Node.js (v18+)

## Getting Started

1.  **Install dependencies:**
    ```bash
    bun install
    ```

2.  **Run the Web Application (Development):**
    ```bash
    cd apps/web
    bun dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

3.  **Build the Chrome Extension:**
    ```bash
    cd apps/extension
    bun run build
    ```
    - This will generate a `dist` folder in `apps/extension`.
    - Open Chrome and go to `chrome://extensions`.
    - Enable "Developer mode" (top right).
    - Click "Load unpacked" and select the `apps/extension/dist` folder.

## Features

- **Web Proxy**: Paste a URL to get a clean, text-only version of the page.
- **Chrome Extension**: Click the "Enable Lite Mode" button in the popup to clean the current page instantly.
- **Shared Logic**: Common interfaces ensure consistency between the web and extension apps.

## Technologies

- **TypeScript**: Strictly typed across the entire monorepo.
- **Next.js**: Server-side rendering and API routes for the web proxy.
- **Vite**: Fast bundling for the Chrome extension.
- **Tailwind CSS**: Utility-first styling for the web app.
- **Cheerio**: HTML parsing and sanitization.

## License

MIT
