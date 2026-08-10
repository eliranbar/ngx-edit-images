/*
 * Public API Surface of ngx-image-editor
 */

export { provideImageEditor } from './lib/config/provide';
export {
  NIE_CONFIG,
  DEFAULT_TOOLS,
  type ImageEditorConfig,
  type NieTheme,
  type NieToolId,
} from './lib/config/tokens';
export {
  NIE_FEATURES,
  FREE_FEATURES,
  PREMIUM_FEATURES,
  ALL_FEATURES,
  type NieFeatureId,
} from './lib/config/features';

export { LicenseService, type LicenseState, type LicensePayload } from './lib/license/license.service';
export { FeatureGateService } from './lib/license/feature-gate.service';
export { NIE_PRODUCT_ID, NIE_LICENSE_KEYRING } from './lib/license/public-key';

export { ImageEditorComponent } from './lib/components/image-editor/image-editor';
export { NieToolbarComponent, DEFAULT_TOOLBAR_ITEMS } from './lib/components/toolbar/toolbar';
export { NieLayersPanelComponent } from './lib/components/layers-panel/layers-panel';
export { NiePropertiesPanelComponent } from './lib/components/properties-panel/properties-panel';
export { NieRulerGuidesComponent } from './lib/components/ruler-guides/ruler-guides';
export { NieContextMenuComponent } from './lib/components/context-menu/context-menu';
export type { ContextMenuItem } from './lib/components/context-menu/context-menu';

export { ImageEditorEngine } from './lib/engine/engine';
export { EditorDocument } from './lib/engine/document';
export { HistoryStack } from './lib/engine/history';
export { ShortcutRegistry, DEFAULT_SHORTCUTS, formatShortcutLabel } from './lib/engine/shortcuts';
export type { ShortcutAction, ShortcutBinding, ShortcutOverrides } from './lib/engine/shortcuts';
export { exportDocument, downloadExport } from './lib/engine/export';
export type { ExportOptions, ExportResult, ExportFormat } from './lib/engine/export';
export { createFilter, BASIC_FILTER_TYPES, EXTENDED_FILTER_TYPES } from './lib/engine/filters/types';
export type { FilterDescriptor, FilterType } from './lib/engine/filters/types';
export {
  createImageLayer,
  createTextLayer,
  createShapeLayer,
  createDrawingLayer,
  createGroupLayer,
  createAdjustmentLayer,
} from './lib/engine/layers/types';
export type {
  AnyLayer,
  ImageLayer,
  TextLayer,
  ShapeLayer,
  DrawingLayer,
  GroupLayer,
  AdjustmentLayer,
  BlendMode,
  Transform2D,
} from './lib/engine/layers/types';
