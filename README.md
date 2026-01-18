<p align="center">
  <img src="apps/web/public/icon.png" width="250" height="240" alt="Lite Read preview">
</p>

<div align="center">

# CLUTTAREX
### *THE WEB IS NOISY. MAKE IT SILENT.*


</div>


---

## THE ECOSYSTEM

### 01 / WEB PROXY
A lightning-fast interface to declutter any URL. Powered by Next.js and optimized for rapid extraction.
- **URL Extraction:** Instant server-side or client-side fallback cleaning.
- **PDF Export:** High-fidelity, multi-page document generation.
- **Fleet Management:** Persistent reading history via local storage.

### 02 / BROWSER EXTENSION
A standalone Chrome utility to clean pages in-situ without leaving your tab.
- **Lite Mode:** One-click distraction removal.
- **Visual Controls:** Real-time font choice, sizing, and theme switching.
- **Force Injection:** Programmatic script delivery for 100% reliability.

---

## ARCHITECTURE

Managed as a **Bun Monorepo** for unified development and shared integrity.

```text
/
├── apps/
│   ├── web/        # Next.js 15 + Tailwind 4 (Proxy & PDF Engine)
│   └── extension/  # Manifest V3 + Vite (The Lite-Mode Cleaner)
└── packages/
    └── shared/     # Shared TS Interfaces & Core Models
```

---

## GETTING STARTED

### PREREQUISITES
- **BUN** (v1.0+)
- **CHROME BROWSER**

### INSTALLATION
```bash
# Clone the repository
git clone https://github.com/TainYanTun/Cluttarex.git

# Install dependencies
bun install
```

### DEVELOPMENT
```bash
# Launch the Web Dashboard
bun --filter web dev

# Build the Extension
bun --filter cluttarex-extension build
```

---

## THE TECH STACK

- **CORE:** TypeScript (Strict Mode)
- **WEB:** Next.js (Edge Runtime API), Tailwind CSS 4
- **EXTENSION:** Vite, Chrome Scripting API
- **PARSING:** Cheerio, DOMParser
- **EXPORT:** jsPDF, html2canvas

---

## LICENSE
MIT. Built for the future of focused reading.

---
**CLUTTAREX / 2026**
