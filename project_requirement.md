# Cluttarex 2.0 - Project Requirements

## Project Overview
Cluttarex is a **text-only reader** that makes web content fast, lightweight, and accessible for everyone.  
It has **two platforms**:

1. **Web Proxy**: Users paste a URL, the server strips images, ads, scripts, and videos, returning a **fast, text-only version** of the page.  
2. **Chrome Extension**: Users can click a button on any webpage to strip clutter and read the text instantly.  
3. Optional: **Hybrid Mode**: Extension can fetch stripped pages from the server for maximum data savings.

**Goal:** Improve accessibility, reduce bandwidth usage, and provide distraction-free reading.  

---

## Tech Stack
- **Language:** TypeScript (no plain JavaScript)
- **Web:** Next.js (API Routes) + jsdom or cheerio + Node-fetch or Axios
- **Chrome Extension:** Manifest v3 + Content Scripts + Background/Service Worker (TS)
- **Styling:** CSS/SCSS for clean text-only UI
- **Optional:** Shared TypeScript interfaces between web and extension

---

## Features

### Web Proxy
- Paste a URL → return **text-only page**
- Strip out:
  - Images
  - Videos
  - Ads
  - JavaScript
- Apply **clean, readable CSS**
- Fast loading (target: 0.1 seconds)
- Works on mobile and desktop

### Chrome Extension
- Button to enable “Cluttarex” mode on any webpage
- Strip unwanted elements **client-side**
- Optional server-mode toggle for **data-saving**
- Apply **custom readable styling**
- Works offline for already loaded pages

### Shared / Optional
- Highlighting / font size adjustment
- Night mode
- Save articles for offline reading

---

## Requirements

### Functional
1. Fetch and parse web pages safely (TypeScript types enforced)
2. Remove clutter while keeping main text intact
3. Display clean readable content
4. Extension communicates with server if server-mode is enabled
5. Responsive design for mobile and desktop

### Non-Functional
1. TypeScript strictly enforced
2. Fast and lightweight
3. Clear error handling for inaccessible URLs
4. Accessible UI (keyboard & screen reader-friendly)
5. Compatible with modern browsers (Chrome extension only Chrome, web proxy cross-browser)

---

## Suggested Project Structure (AI can generate)

