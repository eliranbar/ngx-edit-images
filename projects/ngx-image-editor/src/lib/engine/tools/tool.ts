import type { EditorDocument } from '../document';
import type { HistoryStack } from '../history';
import type { NieToolId } from '../../config/tokens';

export interface PointerEventData {
  /** Document-space coordinates. */
  x: number;
  y: number;
  /** Canvas-relative CSS pixel coordinates (for pan / screen-space tools). */
  screenX: number;
  screenY: number;
  button: number;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  pressure: number;
}

export interface ToolContext {
  doc: EditorDocument;
  history: HistoryStack;
  /** Request a re-render of the viewport. */
  requestRender: () => void;
  /** Optional: open file picker. */
  openFilePicker?: () => void;
  /** Optional: open export dialog. */
  openExport?: () => void;
  /** Brush / eraser settings shared across drawing tools. */
  brush: {
    color: string;
    size: number;
    opacity: number;
  };
  shapeKind: 'rect' | 'ellipse' | 'line' | 'arrow' | 'polygon' | 'star';
  fillColor: string;
  /** Feature gate check. */
  isFeatureEnabled: (feature: string) => boolean;
  setActiveTool: (tool: NieToolId) => void;
}

export interface Tool {
  readonly id: NieToolId;
  readonly cursor: string;
  onActivate?(ctx: ToolContext): void;
  onDeactivate?(ctx: ToolContext): void;
  pointerDown(e: PointerEventData, ctx: ToolContext): void;
  pointerMove(e: PointerEventData, ctx: ToolContext): void;
  pointerUp(e: PointerEventData, ctx: ToolContext): void;
  /** Optional double-click handler (e.g. edit text). */
  doubleClick?(e: PointerEventData, ctx: ToolContext): void;
  /** Optional overlay drawn in document space after the artboard. */
  drawOverlay?(canvasCtx: CanvasRenderingContext2D, ctx: ToolContext): void;
}
