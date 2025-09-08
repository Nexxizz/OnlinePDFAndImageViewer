import { previewPdf, clearPdf } from './viewers/pdf';

const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
const previewEl = document.getElementById('preview') as HTMLElement | null;
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement | null;
const dropZone = document.getElementById('drop-zone') as HTMLElement | null;

if (!fileInput || !previewEl || !clearBtn || !dropZone) {
  console.error('Initialization error: missing required DOM elements.');
}

let revokeUrl: (() => void) | null = null;

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
