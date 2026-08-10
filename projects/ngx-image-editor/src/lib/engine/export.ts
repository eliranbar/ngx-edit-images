import type { EditorDocument } from './document';
import { renderDocument } from './renderer';

export type ExportFormat = 'png' | 'jpeg' | 'webp' | 'svg';

export interface ExportOptions {
  format: ExportFormat;
  quality?: number;
  scale?: number;
  filename?: string;
}

export interface ExportResult {
  blob: Blob;
  dataUrl: string;
  filename: string;
  format: ExportFormat;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Export failed'))),
      type,
      quality,
    );
  });
}

async function exportRaster(
  doc: EditorDocument,
  format: 'png' | 'jpeg' | 'webp',
  quality = 0.92,
  scale = 1,
): Promise<{ blob: Blob; dataUrl: string }> {
  const canvas = renderDocument(doc, undefined, { scale, showOverlay: false, showGrid: false, showGuides: false });
  const mime =
    format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
  const blob = await canvasToBlob(canvas, mime, format === 'png' ? undefined : quality);
  const dataUrl = canvas.toDataURL(mime, format === 'png' ? undefined : quality);
  return { blob, dataUrl };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function exportSvg(doc: EditorDocument): Promise<{ blob: Blob; dataUrl: string }> {
  // Flattened SVG embedding a PNG of the composite for fidelity.
  const { dataUrl: png } = await exportRaster(doc, 'png', 1, 1);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${doc.width}" height="${doc.height}" viewBox="0 0 ${doc.width} ${doc.height}">
  <title>${escapeXml('ngx-image-editor export')}</title>
  <image href="${png}" width="${doc.width}" height="${doc.height}" />
</svg>`;
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  return { blob, dataUrl };
}

export async function exportDocument(
  doc: EditorDocument,
  options: ExportOptions,
): Promise<ExportResult> {
  const format = options.format;
  const filename =
    options.filename ?? `export.${format === 'jpeg' ? 'jpg' : format}`;
  const result =
    format === 'svg'
      ? await exportSvg(doc)
      : await exportRaster(doc, format, options.quality, options.scale ?? 1);
  return { ...result, filename, format };
}

export function downloadExport(result: ExportResult): void {
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  a.click();
  URL.revokeObjectURL(url);
}
