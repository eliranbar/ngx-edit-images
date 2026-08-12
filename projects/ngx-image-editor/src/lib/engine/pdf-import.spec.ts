import { describe, expect, it } from 'vitest';
import { isPdfFile } from './pdf-import';

describe('pdf-import', () => {
  it('detects PDF files by type and extension', () => {
    expect(isPdfFile(new File([], 'doc.pdf', { type: 'application/pdf' }))).toBe(true);
    expect(isPdfFile(new File([], 'doc.PDF', { type: '' }))).toBe(true);
    expect(isPdfFile(new File([], 'pic.png', { type: 'image/png' }))).toBe(false);
  });
});
