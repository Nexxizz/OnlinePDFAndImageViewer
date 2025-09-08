import { renderPdfWithControls } from './viewers/pdfjsViewer';

function getPdfIdFromUrl() {
  const match = window.location.pathname.match(/\/view\/(.+)$/);
  return match ? match[1] : null;
}

async function loadAndShowPdf(id: string) {
  const pdfUrl = `/files/${id}`;
  const previewEl = document.getElementById('preview');
  if (!previewEl) return;
  await renderPdfWithControls({ url: pdfUrl, container: previewEl, maxScale: 1.5 });
}

(function main() {
  const id = getPdfIdFromUrl();
  if (!id) {
    document.body.innerHTML = '<h2>Invalid PDF link</h2>';
    return;
  }
  loadAndShowPdf(id);
})();
