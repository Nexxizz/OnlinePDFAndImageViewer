export function previewPdf(file: File): { element: HTMLElement; revoke: () => void } {
  const url = URL.createObjectURL(file);

  // Use <embed> for a quick MVP; some browsers prefer <iframe>.
  const embed = document.createElement('embed');
  embed.src = url;
  embed.type = 'application/pdf';
  embed.setAttribute('aria-label', 'PDF preview');
  embed.className = 'pdf-embed';

  const revoke = () => URL.revokeObjectURL(url);
  return { element: embed, revoke };
}

export function clearPdf(container: HTMLElement) {
  container.innerHTML = '';
}
