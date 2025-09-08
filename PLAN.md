## Online PDF & Image Viewer — Node + TypeScript Plan (PDF first, then images)

This plan uses Node + TypeScript with Vite for a fast localhost dev server. Phase 1 delivers a quick PDF preview; Phase 2 upgrades to PDF.js for consistent rendering; Phase 3 adds image support.

### Goals
- [ ] Run locally on Windows (localhost) with Node + TS + Vite
- [ ] Phase 1: Upload a PDF and preview it on the page
- [ ] Phase 2: Use PDF.js for consistent PDF rendering and controls
- [ ] Phase 3: Add image (jpg/jpeg/png) preview
- [ ] Client-side only; no server-side storage

---

### 0) Prerequisites
- [ ] Install Node.js LTS (18+)
- [ ] Open the repo `OnlinePDFAndImageViewer` in VS Code

---

### 1) Project scaffolding (TypeScript + Vite)
- [ ] Initialize Node project in repo root
  - [ ] Create `package.json` with scripts for Vite
- [ ] Add TypeScript config `tsconfig.json`
- [ ] Optional: `vite.config.ts` (Vite can also be zero-config)
- [ ] Create files
  - [ ] `index.html` (root)
  - [ ] `src/main.ts` (entry)
  - [ ] `src/viewers/pdf.ts` (Phase 1/2)
  - [ ] `src/viewers/image.ts` (Phase 3)
  - [ ] `src/styles.css`

Windows PowerShell (example):

```powershell
npm init -y
npm install --save-dev vite typescript @types/node
npx tsc --init
```

Add scripts to package.json:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

---

### 2) Phase 1 — PDF MVP (fast path)
- [ ] UI in `index.html`
  - [ ] Header/title and short instructions
  - [ ] File input: `<input type="file" accept="application/pdf">`
  - [ ] Optional drag-and-drop zone
  - [ ] Preview container (e.g., `<div id="preview">`)
  - [ ] Clear/reset button
- [ ] Basic styling in `src/styles.css`
  - [ ] Responsive container, readable fonts, accessible contrasts
  - [ ] Drag-over highlight state

---

### 3) Implement PDF MVP logic (TypeScript)
- [ ] In `src/main.ts`
  - [ ] Wire up file input `change` and drag/drop events
  - [ ] Route PDF files to `pdf.ts`
  - [ ] Clear/reset button and state
- [ ] In `src/viewers/pdf.ts`
  - [ ] Validate file MIME type: `application/pdf`
  - [ ] Create preview URL with `URL.createObjectURL(file)`
  - [ ] Render using `<embed>` or `<iframe type="application/pdf">`
  - [ ] Provide cleanup function to revoke object URL
- [ ] Accessibility
  - [ ] Keyboard focus states, ARIA labels for drop zone and preview

---

### 4) Local development
- [ ] Start Vite dev server
  - [ ] Run: `npm run dev`
  - [ ] Open the shown http://localhost:<port>

---

### 5) Testing checklist (Phase 1)
- [ ] Open in Chrome/Edge/Firefox
- [ ] Upload a small PDF; confirm it previews
- [ ] Replace with another PDF; previous preview is cleared/replaced
- [ ] Try drag-and-drop (if implemented)
- [ ] Clear button removes preview and frees resources
- [ ] No console errors; object URLs are revoked

---

### 6) Phase 2 — PDF.js integration
- [ ] Install: `npm install pdfjs-dist`
- [ ] In `src/viewers/pdf.ts`
  - [ ] Load worker from `pdfjs-dist/build/pdf.worker.mjs`
  - [ ] Read file as ArrayBuffer
  - [ ] Use `getDocument` to load the PDF
  - [ ] Render first page to `<canvas>`
  - [ ] Optional controls: next/prev page, zoom in/out
- [ ] Fallback: if PDF.js fails, use `<embed>`/`<iframe>`

Testing (Phase 2)
- [ ] Multiple PDFs render consistently
- [ ] Controls work (if implemented)

---

### 7) Phase 3 — Image support
- [ ] Update input accept to `application/pdf,image/*`
- [ ] Implement `src/viewers/image.ts`
  - [ ] Validate extensions: `.jpg`, `.jpeg`, `.png`
  - [ ] Render `<img>` with object URL
  - [ ] Optional: zoom/pan controls
- [ ] Route by MIME type in `main.ts`
- [ ] Maintain cleanup of object URLs

Testing (Phase 3)
- [ ] JPG/JPEG/PNG show correctly
- [ ] Switching between PDF and image replaces preview cleanly

---

### 8) Security & privacy
- [ ] Client-side only (no uploads)
- [ ] Don’t execute content from files; restrict to `<embed>`, `<iframe>`, `<img>`, or canvas
- [ ] Consider a minimal Content-Security-Policy when building/hosting

---

### 9) Definition of Done
- [ ] `npm run dev` serves the app at localhost
- [ ] PDF upload previews instantly (Phase 1)
- [ ] PDF.js rendering works (Phase 2)
- [ ] Images preview work (Phase 3)
- [ ] No console errors; resources cleaned up

---

### Suggested file layout
```
OnlinePDFAndImageViewer/
├─ index.html
├─ src/
│  ├─ main.ts
│  ├─ styles.css
│  └─ viewers/
│     ├─ pdf.ts
│     └─ image.ts
├─ tsconfig.json
├─ vite.config.ts (optional)
├─ package.json
└─ README.md
```

If you want, I can scaffold Phase 1 now (Node + TS + Vite) and deliver a working PDF preview in one pass.
