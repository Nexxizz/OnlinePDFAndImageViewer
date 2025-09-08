import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist';
// Set worker from pdfjs-dist
// @ts-ignore - Vite will resolve this asset
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
GlobalWorkerOptions.workerSrc = pdfWorker as unknown as string;

export type PdfJsRenderOptions = {
  url: string; // absolute or relative URL
  container: HTMLElement; // scrollable container to render pages into
  maxScale?: number; // optional, default 1.5
};

export type PdfJsResult = {
  doc: PDFDocumentProxy;
  textContent: string; // concatenated text for machine readability
  destroy: () => Promise<void>;
};

export async function renderPdfScrollable(opts: PdfJsRenderOptions): Promise<PdfJsResult> {
  const { url, container } = opts;
  const maxScale = opts.maxScale ?? 1.5;

  container.innerHTML = '';
  container.classList.add('pdfjs-container');

  const loadingTask = getDocument(url);
  const pdf = await loadingTask.promise;

  const textParts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    // Fit-to-page: consider both available width and height for this container
    const contWidth = Math.max(320, container.clientWidth - 32);
    const contHeight = Math.max(200, (container.clientHeight || window.innerHeight) - 32 - 24); // 24px vertical margins
    const scaleW = contWidth / viewport.width;
    const scaleH = contHeight / viewport.height;
    const scale = Math.min(maxScale, scaleW, scaleH);
    const scaledViewport = page.getViewport({ scale: isFinite(scale) && scale > 0 ? scale : 1 });

    const pageWrapper = document.createElement('div');
    pageWrapper.className = 'pdfjs-page';
    pageWrapper.style.width = `${scaledViewport.width}px`;
    pageWrapper.style.height = `${scaledViewport.height}px`;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    canvas.width = Math.ceil(scaledViewport.width);
    canvas.height = Math.ceil(scaledViewport.height);
    canvas.style.width = `${scaledViewport.width}px`;
    canvas.style.height = `${scaledViewport.height}px`;

    pageWrapper.appendChild(canvas);
    container.appendChild(pageWrapper);

    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

    // Extract text for machine readability
    const text = await page.getTextContent();
    const pageText = text.items.map((i: any) => ('str' in i ? i.str : '')).join(' ').trim();
    if (pageText) textParts.push(pageText);
  }

  const textContent = textParts.join('\n');

  // Expose text content in a hidden, accessible element for screen readers/machines
  const sr = document.createElement('pre');
  sr.className = 'pdfjs-text-content';
  sr.textContent = textContent;
  sr.setAttribute('aria-hidden', 'false');
  sr.tabIndex = -1;
  container.appendChild(sr);

  return {
    doc: pdf,
    textContent,
    destroy: async () => {
      await pdf.destroy();
      container.innerHTML = '';
    },
  };
}

// Controlled viewer with thumbnails + toolbar and a global API (window.pdfViewer)
export async function renderPdfWithControls(opts: PdfJsRenderOptions): Promise<PdfJsResult> {
  const { url, container } = opts;
  const maxScale = opts.maxScale ?? 1.5;

  container.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'pdfjs-viewer';

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'pdfjs-toolbar';
  toolbar.innerHTML = `
    <button id="pdf-prev" aria-label="Previous page" data-testid="pdf-prev">Prev</button>
    <input id="pdf-page-input" type="number" min="1" value="1" aria-label="Page number" data-testid="pdf-page-input" />
    <span id="pdf-page-count" aria-live="polite" data-testid="pdf-page-count">/ ?</span>
    <button id="pdf-next" aria-label="Next page" data-testid="pdf-next">Next</button>
    <span style="flex:1"></span>
    <label style="display:flex;align-items:center;gap:.4rem;">
      <input type="checkbox" id="pdf-semantic-toggle" />
      <span>Semantic HTML</span>
    </label>
  `;

  // Layout: sidebar + pages
  const layout = document.createElement('div');
  layout.className = 'pdfjs-layout';
  const sidebar = document.createElement('nav');
  sidebar.className = 'pdfjs-thumbs';
  sidebar.setAttribute('aria-label', 'Page thumbnails');
  const pages = document.createElement('div');
  pages.className = 'pdfjs-pages';

  wrapper.append(toolbar, layout);
  layout.append(sidebar, pages);
  container.appendChild(wrapper);

  // Load doc
  const loadingTask = getDocument(url);
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  (document.getElementById('pdf-page-count') as HTMLElement).textContent = `/ ${pageCount}`;

  const pageWrappers: HTMLElement[] = [];
  const textParts: string[] = [];

  // Render pages and thumbnails (Canvas mode)
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    // Fit-to-page in the pages column: use width and height
    const cs = getComputedStyle(pages);
    const padX = (parseFloat(cs.paddingLeft || '0') + parseFloat(cs.paddingRight || '0')) || 0;
    const padY = (parseFloat(cs.paddingTop || '0') + parseFloat(cs.paddingBottom || '0')) || 0;
    const pagesWidth = (pages.clientWidth || (container.clientWidth - 320)) - padX - 32; // minus padding + inner gap
    const pagesHeight = (pages.clientHeight || window.innerHeight) - padY - 24; // minus padding + page margins
    const scaleW = pagesWidth / viewport.width;
    const scaleH = pagesHeight / viewport.height;
    const scale = Math.min(maxScale, scaleW, scaleH);
    const scaledViewport = page.getViewport({ scale: isFinite(scale) && scale > 0 ? scale : 1 });

    const pageWrapper = document.createElement('div');
    pageWrapper.className = 'pdfjs-page';
    pageWrapper.id = `pdf-page-${pageNum}`;
    pageWrapper.dataset.page = String(pageNum);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    canvas.width = Math.ceil(scaledViewport.width);
    canvas.height = Math.ceil(scaledViewport.height);
    canvas.style.width = `${scaledViewport.width}px`;
    canvas.style.height = `${scaledViewport.height}px`;

    pageWrapper.appendChild(canvas);
    pages.appendChild(pageWrapper);
    pageWrappers.push(pageWrapper);

    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

    // thumbnail
    const thumbItem = document.createElement('button');
    thumbItem.className = 'pdfjs-thumb';
    thumbItem.type = 'button';
    thumbItem.dataset.page = String(pageNum);
    thumbItem.setAttribute('aria-label', `Go to page ${pageNum}`);
    const thumbCanvas = document.createElement('canvas');
    const tctx = thumbCanvas.getContext('2d');
    const tScale = 120 / scaledViewport.width;
    const tViewport = page.getViewport({ scale: tScale });
    if (tctx) {
      thumbCanvas.width = Math.ceil(tViewport.width);
      thumbCanvas.height = Math.ceil(tViewport.height);
      await page.render({ canvasContext: tctx, viewport: tViewport }).promise;
    }
    thumbItem.appendChild(thumbCanvas);
    sidebar.appendChild(thumbItem);

    thumbItem.addEventListener('click', () => goToPage(pageNum));

    // text
    const text = await page.getTextContent();
    const pageText = text.items.map((i: any) => ('str' in i ? i.str : '')).join(' ').trim();
    if (pageText) textParts.push(pageText);
  }

  // Hidden text block for machines
  const sr = document.createElement('pre');
  sr.className = 'pdfjs-text-content';
  sr.textContent = textParts.join('\n');
  sr.setAttribute('aria-hidden', 'false');
  sr.id = 'pdf-text-content';
  container.appendChild(sr);

  // Navigation API
  let currentPage = 1;
  let mode: 'canvas' | 'html' = 'canvas';
  let htmlRoot: HTMLElement | null = null;
  function highlightThumb(n: number) {
    sidebar.querySelectorAll('.pdfjs-thumb.active').forEach(el => el.classList.remove('active'));
    const t = sidebar.querySelector(`.pdfjs-thumb[data-page="${n}"]`);
    if (t) t.classList.add('active');
  }
  function goToPage(n: number) {
    const clamped = Math.max(1, Math.min(pageCount, Math.floor(n)));
    currentPage = clamped;
    const target = document.getElementById(`pdf-page-${clamped}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const input = document.getElementById('pdf-page-input') as HTMLInputElement | null;
    if (input) input.value = String(clamped);
    highlightThumb(clamped);
    // reflect in URL hash for deep-link
    try { const u = new URL(window.location.href); u.hash = `page=${clamped}`; history.replaceState({}, '', u); } catch {}
  }
  function nextPage() { goToPage(currentPage + 1); }
  function prevPage() { goToPage(currentPage - 1); }

  // Bind toolbar
  (document.getElementById('pdf-prev') as HTMLButtonElement)?.addEventListener('click', prevPage);
  (document.getElementById('pdf-next') as HTMLButtonElement)?.addEventListener('click', nextPage);
  (document.getElementById('pdf-page-input') as HTMLInputElement)?.addEventListener('change', (e) => {
    const v = Number((e.currentTarget as HTMLInputElement).value);
    if (!Number.isNaN(v)) goToPage(v);
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') nextPage();
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') prevPage();
  });

  // Observer to update current page
  const io = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) {
      const p = Number((visible.target as HTMLElement).dataset.page || '1');
      currentPage = p;
      const input = document.getElementById('pdf-page-input') as HTMLInputElement | null;
      if (input) input.value = String(p);
      highlightThumb(p);
    }
  }, { root: pages, threshold: [0.6] });
  pageWrappers.forEach(w => io.observe(w));

  // Initial page from hash or query
  const urlObj = new URL(window.location.href);
  const hashPage = Number((urlObj.hash.match(/page=(\d+)/) || [])[1] || urlObj.searchParams.get('page'));
  if (!Number.isNaN(hashPage) && hashPage >= 1) goToPage(hashPage); else goToPage(1);

  // Build Semantic HTML view on demand
  async function buildSemanticHtml(): Promise<HTMLElement> {
    const root = document.createElement('div');
    root.className = 'pdfjs-html';
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const text = await page.getTextContent();
      type Item = { str: string; transform: number[] };
      const items = text.items as unknown as Item[];
      // Map to positioned items
      const positioned = items.map((i) => {
        const [a, b, c, d, e, f] = i.transform;
        const x = e;
        const y = f;
        const scaleY = Math.hypot(c, d) || Math.abs(d) || 1; // rough font size proxy
        return { str: i.str, x, y, size: scaleY };
      });
      // Group by Y (lines)
      const tol = 4; // px tolerance
      positioned.sort((p1, p2) => p2.y - p1.y || p1.x - p2.x);
      const lines: { y: number; sizeAvg: number; parts: { x: number; str: string }[] }[] = [];
      for (const it of positioned) {
        let line = lines.find(l => Math.abs(l.y - it.y) <= tol);
        if (!line) {
          line = { y: it.y, sizeAvg: it.size, parts: [] };
          lines.push(line);
        } else {
          line.sizeAvg = (line.sizeAvg + it.size) / 2;
        }
        line.parts.push({ x: it.x, str: it.str });
      }
      // Sort lines top-to-bottom and parts left-to-right
      lines.sort((a, b) => b.y - a.y);
      const sizes = lines.map(l => l.sizeAvg).filter(n => Number.isFinite(n) && n > 0);
      const median = (() => {
        if (!sizes.length) return 12;
        const s = [...sizes].sort((a, b) => a - b);
        const mid = Math.floor(s.length / 2);
        return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
      })();
      // Table detection helpers
      const roundX = (x: number) => Math.round(x / 20) * 20;
      const sameCols = (a: number[], b: number[]) => {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 20) return false;
        return true;
      };
      let i = 0;
      while (i < lines.length) {
        const l = lines[i];
        l.parts.sort((a, b) => a.x - b.x);
        const xs = l.parts.map(p => roundX(p.x));
        const asText = l.parts.map(p => p.str);
        const isTableCandidate = l.parts.length >= 3;
        if (!isTableCandidate) {
          const textLine = asText.join('').replace(/\s{2,}/g, ' ').trim();
          if (textLine) {
            const ratio = l.sizeAvg / (median || 12);
            let el: HTMLElement;
            if (ratio > 1.6) el = document.createElement('h1');
            else if (ratio > 1.35) el = document.createElement('h2');
            else if (ratio > 1.2) el = document.createElement('h3');
            else {
              // bullets → list
              if (/^([\u2022\-\*])\s/.test(textLine)) {
                const ul = document.createElement('ul');
                const li = document.createElement('li');
                li.textContent = textLine.replace(/^([\u2022\-\*])\s/, '');
                ul.appendChild(li);
                root.appendChild(ul);
                i++;
                continue;
              }
              el = document.createElement('p');
            }
            el.textContent = textLine;
            root.appendChild(el);
          }
          i++;
          continue;
        }
        // Try to accumulate a table block with stable columns
        const baseCols = xs;
        const rows: string[][] = [asText];
        let j = i + 1;
        for (; j < lines.length; j++) {
          const ln = lines[j];
          ln.parts.sort((a, b) => a.x - b.x);
          const cols = ln.parts.map(p => roundX(p.x));
          if (!sameCols(baseCols, cols)) break;
          rows.push(ln.parts.map(p => p.str));
        }
        if (rows.length >= 3) {
          const table = document.createElement('table');
          table.className = 'pdfjs-html-table';
          const tbody = document.createElement('tbody');
          // Use first row as header if text seems like labels (all non-numeric tokens)
          const headerLike = rows[0].every(cell => /[A-Za-z]/.test(cell) && !/^\d+[\d\s.,-]*$/.test(cell));
          if (headerLike) {
            const thead = document.createElement('thead');
            const tr = document.createElement('tr');
            rows[0].forEach(c => { const th = document.createElement('th'); th.textContent = c.trim(); tr.appendChild(th); });
            thead.appendChild(tr);
            table.appendChild(thead);
            rows.slice(1).forEach(r => {
              const trb = document.createElement('tr');
              r.forEach(c => { const td = document.createElement('td'); td.textContent = c.trim(); trb.appendChild(td); });
              tbody.appendChild(trb);
            });
          } else {
            rows.forEach(r => {
              const trb = document.createElement('tr');
              r.forEach(c => { const td = document.createElement('td'); td.textContent = c.trim(); trb.appendChild(td); });
              tbody.appendChild(trb);
            });
          }
          table.appendChild(tbody);
          root.appendChild(table);
          i = j;
        } else {
          // Not enough stable rows; fallback to paragraph
          const textLine = asText.join('').replace(/\s{2,}/g, ' ').trim();
          if (textLine) {
            const p = document.createElement('p');
            p.textContent = textLine;
            root.appendChild(p);
          }
          i++;
        }
      }
      if (pageNum < pageCount) {
        const hr = document.createElement('hr');
        hr.className = 'pdfjs-html-sep';
        root.appendChild(hr);
      }
    }
    return root;
  }

  async function switchToHtml() {
    if (mode === 'html') return;
    mode = 'html';
    // Clear canvas layout
  pages.replaceChildren();
  sidebar.replaceChildren();
  // Hide sidebar to give semantic HTML full width
  (sidebar as HTMLElement).style.display = 'none';
  htmlRoot = await buildSemanticHtml();
  // Make sure semantic HTML takes the full grid width
  htmlRoot.style.gridColumn = '1 / -1';
  // Replace the pages panel with the semantic HTML so it sits in the main area
  layout.replaceChild(htmlRoot, pages);
  }

  function switchToCanvas() {
    if (mode === 'canvas') return;
    mode = 'canvas';
  if (htmlRoot && htmlRoot.parentElement) htmlRoot.parentElement.removeChild(htmlRoot);
  // Restore sidebar visibility
  (sidebar as HTMLElement).style.display = '';
  // Re-render by refreshing the page (simpler for now)
  // In-app re-rendering would require caching; we opt for a soft reload.
  location.reload();
  }

  (document.getElementById('pdf-semantic-toggle') as HTMLInputElement | null)?.addEventListener('change', (e) => {
    const on = (e.currentTarget as HTMLInputElement).checked;
    if (on) switchToHtml(); else switchToCanvas();
  });

  // Always build a hidden semantic HTML block for machines (even in canvas mode)
  (async () => {
    try {
      const hidden = await buildSemanticHtml();
      hidden.classList.add('pdfjs-html-hidden');
      hidden.id = 'pdf-semantic-hidden';
      container.appendChild(hidden);
    } catch (err) {
      // no-op
    }
  })();

  // Expose machine-controllable API
  const api = {
    goToPage,
    nextPage,
    prevPage,
    getCurrentPage: () => currentPage,
    getPageCount: () => pageCount,
    getAllText: () => sr.textContent || '',
    getHiddenSemanticHTML: () => {
      const el = document.getElementById('pdf-semantic-hidden');
      return el ? (el as HTMLElement).innerHTML : '';
    },
    getSemanticHTML: async () => {
      if (mode === 'html' && htmlRoot) return htmlRoot.innerHTML;
      const tmp = await buildSemanticHtml();
      const html = tmp.innerHTML;
      tmp.remove();
      return html;
    },
  };
  (window as any).pdfViewer = api;

  return {
    doc: pdf,
    textContent: sr.textContent || '',
    destroy: async () => {
      io.disconnect();
      await pdf.destroy();
      if ((window as any).pdfViewer === api) delete (window as any).pdfViewer;
      container.innerHTML = '';
    },
  };
}
