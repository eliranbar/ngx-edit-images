/// <reference path="../types/gifenc.d.ts" />

import type { EditorDocument } from './document';
import { renderDocument } from './renderer';

export type ExportFormat = 'png' | 'jpeg' | 'webp' | 'avif' | 'gif' | 'tiff' | 'svg';

export interface ExportOptions {
  format: ExportFormat;
  quality?: number;
  scale?: number;
  filename?: string;
  /** URL of the AVIF encoder WASM asset. */
  avifWasmUrl?: string;
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

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read exported image'));
    reader.readAsDataURL(blob);
  });
}

function canvasImageData(canvas: HTMLCanvasElement): ImageData {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not read the rendered image');
  }
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

async function encodeGif(imageData: ImageData): Promise<Blob> {
  const { default: gifenc } = await import('gifenc');
  const { GIFEncoder, quantize, applyPalette } = gifenc;
  const palette = quantize(imageData.data, 256);
  const index = applyPalette(imageData.data, palette);
  const gif = GIFEncoder();
  gif.writeFrame(index, imageData.width, imageData.height, { palette, repeat: -1 });
  gif.finish();
  return new Blob([Uint8Array.from(gif.bytes()).buffer], { type: 'image/gif' });
}

async function encodeAvif(
  imageData: ImageData,
  quality: number,
  wasmUrl = new URL('assets/ngx-image-editor/avif_enc.wasm', document.baseURI).href,
): Promise<Blob> {
  const [{ default: createAvifModule }, { defaultOptions }] = await Promise.all([
    import('@jsquash/avif/codec/enc/avif_enc.js'),
    import('@jsquash/avif/meta.js'),
  ]);
  const encoder = await createAvifModule({
    locateFile: (path: string) => (path.endsWith('.wasm') ? wasmUrl : path),
  });
  const options = {
    ...defaultOptions,
    quality: Math.round(Math.max(0, Math.min(1, quality)) * 100),
    speed: 8,
  };
  const rgba = new Uint8Array(
    imageData.data.buffer,
    imageData.data.byteOffset,
    imageData.data.byteLength,
  );
  const output = encoder.encode(rgba, imageData.width, imageData.height, options);
  if (!output) {
    throw new Error('AVIF encoding failed');
  }
  return new Blob([Uint8Array.from(output).buffer], { type: 'image/avif' });
}

async function encodeTiff(imageData: ImageData): Promise<Blob> {
  const { default: utif } = await import('utif');
  const bytes = new Uint8Array(
    imageData.data.buffer,
    imageData.data.byteOffset,
    imageData.data.byteLength,
  );
  return new Blob([utif.encodeImage(bytes, imageData.width, imageData.height)], {
    type: 'image/tiff',
  });
}

async function exportRaster(
  doc: EditorDocument,
  format: Exclude<ExportFormat, 'svg'>,
  quality = 0.92,
  scale = 1,
  avifWasmUrl?: string,
): Promise<{ blob: Blob; dataUrl: string }> {
  const canvas = renderDocument(doc, undefined, { scale, showOverlay: false, showGrid: false, showGuides: false });
  if (format === 'gif' || format === 'avif' || format === 'tiff') {
    const imageData = canvasImageData(canvas);
    const blob =
      format === 'gif'
        ? await encodeGif(imageData)
        : format === 'avif'
          ? await encodeAvif(imageData, quality, avifWasmUrl)
          : await encodeTiff(imageData);
    return { blob, dataUrl: await blobToDataUrl(blob) };
  }

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
  const extension = format === 'jpeg' ? 'jpg' : format === 'tiff' ? 'tif' : format;
  const filename =
    options.filename ?? `export.${extension}`;
  const result =
    format === 'svg'
      ? await exportSvg(doc)
      : await exportRaster(
          doc,
          format,
          options.quality,
          options.scale ?? 1,
          options.avifWasmUrl,
        );
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
