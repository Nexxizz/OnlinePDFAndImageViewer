# Online PDF & Image Viewer

Local-first web app to upload a PDF, get a shareable link, and view it in a custom, machine-readable PDF viewer.

## Features

- Upload PDF locally (no cloud). Returns a shareable link like `/view/<fileId>.pdf`.
- Fullscreen, scrollable PDF viewer powered by PDF.js (no browser default viewer).
- Thumbnail sidebar + Prev/Next + jump-to-page input.
- Extracted text is exposed for assistive tech and automations.
- Programmatic control via a small JavaScript API on `window.pdfViewer`.

## Requirements

- Node.js 18+ (recommended LTS)
- Windows, macOS, or Linux. The examples below show Windows PowerShell.

## Quick start

1) Install dependencies
	 - npm install
2) Start dev (Vite + API server)
	 - npm run dev
3) Open the app
	 - http://localhost:5173/

If a port is “already in use,” see Troubleshooting.

## What you can do

- Drag & drop a PDF or choose a file, then click Upload.
- You’ll get a shareable link (e.g. `/view/abc123.pdf`) that opens the custom viewer.
- On the viewer page:
	- Click thumbnails to jump to pages.
	- Use Prev/Next and the page number input.
	- The page is centered and fits the viewport while preserving aspect ratio.

## Programmatic control (for bots/AI)

When a PDF is loaded (either on `/` after upload or on `/view/:id`), the viewer exposes:

- `window.pdfViewer.goToPage(n: number)`
- `window.pdfViewer.nextPage()`
- `window.pdfViewer.prevPage()`
- `window.pdfViewer.getCurrentPage(): number`
- `window.pdfViewer.getPageCount(): number`
- `window.pdfViewer.getAllText(): string` — concatenated extracted text from all pages

Example in DevTools console:

```js
window.pdfViewer.getPageCount();
window.pdfViewer.goToPage(3);
window.pdfViewer.getAllText().slice(0, 500);
```

## API

- POST `/api/upload`
	- FormData field: `file` (PDF only)
	- Response: `{ url: "/files/<id>.pdf", filename: "<storedName>.pdf" }`
	- The viewer link is `/view/<id>.pdf` (the app generates this for you after upload).

- GET `/files/<id>.pdf`
	- Serves the uploaded PDF from local disk under `uploads/`.

## Scripts

- `npm run dev` — start Vite (frontend) and the TypeScript Express server (backend)
- `npm run build` — build the frontend
- `npm run preview` — preview the built frontend

## Project structure

```
index.html               # SPA entry with simple router for / and /view/*
server.ts                # Express upload API & static /files
vite.config.ts           # Vite dev server + proxy for /api and /files
src/
	main.ts               # Home page (upload + preview)
	viewPdf.ts            # Viewer route (/view/:id)
	viewers/
		pdf.ts             # Simple <embed> preview helper (legacy)
		pdfjsViewer.ts     # PDF.js-based viewer with controls + text extraction
	styles.css            # Styles for app and viewer
uploads/                 # Uploaded files (gitignored)
```

## Troubleshooting

Port already in use on Windows PowerShell:

```powershell
# Free Vite port 5173
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process -Force

# Free API server port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force

# Start again
npm run dev
```

If you prefer, change ports instead of killing processes:
- `vite.config.ts` → `server.port`
- `server.ts` → set `PORT` env (e.g., `$env:PORT=3001` before `npm run dev`)

## Notes

- This is a local testing app; tweak caching/headers in `server.ts` if hosting.
- For images support (JPG/PNG) or more viewer controls (fit width/page toggle, zoom), open an issue or request here.
