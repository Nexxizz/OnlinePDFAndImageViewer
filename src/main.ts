import { previewPdf, clearPdf } from './viewers/pdf';

const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
const previewEl = document.getElementById('preview') as HTMLElement | null;
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement | null;
const uploadBtn = document.getElementById('upload-btn') as HTMLButtonElement | null;
const shareEl = document.getElementById('share') as HTMLElement | null;
const dropZone = document.getElementById('drop-zone') as HTMLElement | null;

if (!fileInput || !previewEl || !clearBtn || !dropZone) {
  console.error('Initialization error: missing required DOM elements.');
}

let revokeUrl: (() => void) | null = null;
let lastFile: File | null = null;

function handleFile(file: File) {
  // Only PDFs in Phase 1
  if (file.type !== 'application/pdf') {
    alert('Please select a PDF file.');
    return;
  }
  // Clear previous preview
  if (revokeUrl) {
    revokeUrl();
    revokeUrl = null;
  }
  if (previewEl) previewEl.innerHTML = '';

  const { element, revoke } = previewPdf(file);
  revokeUrl = revoke;
  previewEl?.appendChild(element);
  lastFile = file;
}

fileInput?.addEventListener('change', (e) => {
  const input = e.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  if (file) handleFile(file);
});

clearBtn?.addEventListener('click', () => {
  if (revokeUrl) {
    revokeUrl();
    revokeUrl = null;
  }
  clearPdf(previewEl!);
});

// Drag-and-drop
['dragenter', 'dragover'].forEach((type) => {
  dropZone?.addEventListener(type, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach((type) => {
  dropZone?.addEventListener(type, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });
});

dropZone?.addEventListener('drop', (e: DragEvent) => {
  const dt = e.dataTransfer;
  const file = dt?.files?.[0];
  if (file) handleFile(file);
});

// Upload button: send to /api/upload and show shareable link
uploadBtn?.addEventListener('click', async () => {
  if (!lastFile) {
    alert('Select a PDF first.');
    return;
  }
  try {
    const body = new FormData();
    body.append('file', lastFile);
    const res = await fetch('/api/upload', { method: 'POST', body });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Upload failed');
    }
    const data = await res.json() as { url: string; filename: string };
    const fullUrl = new URL(data.url, window.location.origin).toString();
    if (shareEl) {
      shareEl.innerHTML = '';
      const a = document.createElement('a');
      a.href = data.url; // Use proxy in dev; fullUrl is shown as text
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = 'Open uploaded PDF';
      const p = document.createElement('p');
      p.textContent = `Shareable link: ${fullUrl}`;
      shareEl.append(a, p);
    }
    // Also update preview to load from the shareable link
    if (previewEl) {
      previewEl.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.src = data.url; // goes through Vite proxy during dev
      iframe.className = 'pdf-iframe';
      iframe.title = 'Uploaded PDF preview';
      previewEl.appendChild(iframe);
    }
  } catch (err) {
    console.error(err);
    alert(err instanceof Error ? err.message : 'Upload failed');
  }
});
