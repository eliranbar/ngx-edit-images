declare module 'gifenc' {
  type Palette = number[][];

  interface GifFrameOptions {
    palette: Palette;
    repeat?: number;
  }

  interface GifEncoder {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options: GifFrameOptions,
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  }

  export function GIFEncoder(): GifEncoder;
  export function quantize(rgba: Uint8ClampedArray, maxColors: number): Palette;
  export function applyPalette(rgba: Uint8ClampedArray, palette: Palette): Uint8Array;

  const gifenc: {
    GIFEncoder: typeof GIFEncoder;
    quantize: typeof quantize;
    applyPalette: typeof applyPalette;
  };
  export default gifenc;
}
