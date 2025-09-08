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

  // Render pages and thumbnails
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

  // Expose machine-controllable API
  const api = {
    goToPage,
    nextPage,
    prevPage,
    getCurrentPage: () => currentPage,
    getPageCount: () => pageCount,
    getAllText: () => sr.textContent || '',
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
