/**
 * Premium PDF → image import via pdfjs-dist (optional peer).
 * Each selected page is rasterized to a canvas and returned for image layers.
 */

export interface PdfPageRaster {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export interface PdfImportOptions {
  /** 1-based page numbers. Defaults to all pages (capped by maxPages). */
  pages?: number[];
  /** Render scale (device pixels per PDF unit). Default 2. */
  scale?: number;
  /** Hard cap on pages imported in one go. Default 20. */
  maxPages?: number;
  /** Override pdf.js worker URL. */
  workerSrc?: string;
}

export interface PdfDocumentInfo {
  pageCount: number;
  title?: string;
}

type PdfjsModule = typeof import('pdfjs-dist');

let pdfjsPromise: Promise<PdfjsModule> | null = null;
let workerConfigured = false;

async function loadPdfJs(workerSrc?: string): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').catch((err) => {
      pdfjsPromise = null;
      throw new Error(
        'PDF import requires the optional peer dependency "pdfjs-dist". ' +
          'Install it with: npm install pdfjs-dist',
        { cause: err },
      );
    });
  }
  const pdfjs = await pdfjsPromise;
  if (!workerConfigured) {
    const version = (pdfjs as { version?: string }).version ?? '5.7.284';
    pdfjs.GlobalWorkerOptions.workerSrc =
      workerSrc ??
      `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
    workerConfigured = true;
  }
  return pdfjs;
}

export function isPdfFile(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  if (type === 'application/pdf' || type === 'application/x-pdf') return true;
  return /\.pdf$/i.test(file.name);
}

/** Inspect a PDF without importing pages. */
export async function inspectPdf(
  file: File,
  options: Pick<PdfImportOptions, 'workerSrc'> = {},
): Promise<PdfDocumentInfo> {
  const pdfjs = await loadPdfJs(options.workerSrc);
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  let title: string | undefined;
  try {
    const meta = await pdf.getMetadata();
    const info = meta?.info as { Title?: string } | undefined;
    title = info?.Title || undefined;
  } catch {
    // metadata optional
  }
  const pageCount = pdf.numPages;
  await pdf.destroy();
  return { pageCount, title };
}

/** Rasterize selected PDF pages to canvases. */
export async function rasterizePdfPages(
  file: File,
  options: PdfImportOptions = {},
): Promise<PdfPageRaster[]> {
  const pdfjs = await loadPdfJs(options.workerSrc);
  const scale = options.scale ?? 2;
  const maxPages = options.maxPages ?? 20;
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;

  const allPages = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
  const requested = (options.pages?.length ? options.pages : allPages)
    .filter((n) => n >= 1 && n <= pdf.numPages)
    .slice(0, maxPages);

  const pages: PdfPageRaster[] = [];
  for (const pageNumber of requested) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not create canvas context for PDF page');
    }
    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;
    pages.push({
      pageNumber,
      canvas,
      width: canvas.width,
      height: canvas.height,
    });
  }

  await pdf.destroy();
  return pages;
}
