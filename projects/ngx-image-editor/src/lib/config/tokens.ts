import { InjectionToken } from '@angular/core';
import { NieFeatureId } from './features';
import type { ShortcutOverrides } from '../engine/shortcuts';

export type NieTheme = 'light' | 'dark';

export type NieToolId =
  | 'move'
  | 'transform'
  | 'crop'
  | 'zoom'
  | 'pan'
  | 'text'
  | 'shape'
  | 'brush'
  | 'eraser'
  | 'select-rect'
  | 'select-ellipse'
  | 'lasso'
  | 'magic-wand'
  | 'clone'
  | 'healing'
  | 'eyedropper'
  | 'fill';

export interface ImageEditorConfig {
  /** Offline signed license key unlocking premium features. */
  licenseKey?: string;
  /** Extra free features granted without a license (honor-system override). */
  extraFeatures?: NieFeatureId[];
  /** Default theme for the editor chrome. */
  theme?: NieTheme;
  /** Override which tools appear in the toolbar (still gated by license). */
  tools?: NieToolId[];
  /** Override or disable keyboard shortcuts. Pass `null` for a binding to disable it. */
  shortcuts?: ShortcutOverrides;
  /** Default canvas width in document pixels. */
  canvasWidth?: number;
  /** Default canvas height in document pixels. */
  canvasHeight?: number;
  /** Background color behind transparent areas. */
  canvasBackground?: string;
  /**
   * pdf.js worker URL for premium PDF import.
   * Defaults to a CDN build matching the installed pdfjs-dist version.
   */
  pdfWorkerSrc?: string;
  /** Max PDF pages imported in one action (default 20). */
  pdfMaxPages?: number;
  /** Render scale when rasterizing PDF pages (default 2). */
  pdfRenderScale?: number;
}

export const DEFAULT_TOOLS: NieToolId[] = [
  'move',
  'transform',
  'crop',
  'pan',
  'zoom',
  'text',
  'shape',
  'brush',
  'eraser',
  'select-rect',
  'select-ellipse',
  'lasso',
  'magic-wand',
  'clone',
  'healing',
  'eyedropper',
  'fill',
];

export const NIE_CONFIG = new InjectionToken<ImageEditorConfig>('NIE_CONFIG', {
  providedIn: 'root',
  factory: () => ({}),
});
