/** Feature identifiers used for free / premium gating. */
export const NIE_FEATURES = {
  // Free
  canvas: 'canvas',
  imageLayers: 'imageLayers',
  upload: 'upload',
  move: 'move',
  transform: 'transform',
  crop: 'crop',
  zoomPan: 'zoomPan',
  undoRedo: 'undoRedo',
  text: 'text',
  shapes: 'shapes',
  layersPanel: 'layersPanel',
  opacity: 'opacity',
  basicFilters: 'basicFilters',
  guides: 'guides',
  grid: 'grid',
  alignment: 'alignment',
  exportRaster: 'exportRaster',
  // Premium
  brush: 'brush',
  eraser: 'eraser',
  masks: 'masks',
  groups: 'groups',
  blendModes: 'blendModes',
  advancedSelection: 'advancedSelection',
  cloneStamp: 'cloneStamp',
  healing: 'healing',
  perspective: 'perspective',
  warp: 'warp',
  layerStyles: 'layerStyles',
  adjustmentLayers: 'adjustmentLayers',
  nonDestructiveFilters: 'nonDestructiveFilters',
  extendedFilters: 'extendedFilters',
  exportSvg: 'exportSvg',
  /** Import PDF pages as editable image layers. */
  pdf: 'pdf',
  // Phase 3 stubs
  psd: 'psd',
  raw: 'raw',
  colorManagement: 'colorManagement',
} as const;

export type NieFeatureId = (typeof NIE_FEATURES)[keyof typeof NIE_FEATURES];

export const FREE_FEATURES: readonly NieFeatureId[] = [
  NIE_FEATURES.canvas,
  NIE_FEATURES.imageLayers,
  NIE_FEATURES.upload,
  NIE_FEATURES.move,
  NIE_FEATURES.transform,
  NIE_FEATURES.crop,
  NIE_FEATURES.zoomPan,
  NIE_FEATURES.undoRedo,
  NIE_FEATURES.text,
  NIE_FEATURES.shapes,
  NIE_FEATURES.layersPanel,
  NIE_FEATURES.opacity,
  NIE_FEATURES.basicFilters,
  NIE_FEATURES.guides,
  NIE_FEATURES.grid,
  NIE_FEATURES.alignment,
  NIE_FEATURES.exportRaster,
];

export const PREMIUM_FEATURES: readonly NieFeatureId[] = [
  NIE_FEATURES.brush,
  NIE_FEATURES.eraser,
  NIE_FEATURES.masks,
  NIE_FEATURES.groups,
  NIE_FEATURES.blendModes,
  NIE_FEATURES.advancedSelection,
  NIE_FEATURES.cloneStamp,
  NIE_FEATURES.healing,
  NIE_FEATURES.perspective,
  NIE_FEATURES.warp,
  NIE_FEATURES.layerStyles,
  NIE_FEATURES.adjustmentLayers,
  NIE_FEATURES.nonDestructiveFilters,
  NIE_FEATURES.extendedFilters,
  NIE_FEATURES.exportSvg,
  NIE_FEATURES.pdf,
  NIE_FEATURES.psd,
  NIE_FEATURES.raw,
  NIE_FEATURES.colorManagement,
];

export const ALL_FEATURES: readonly NieFeatureId[] = [
  ...FREE_FEATURES,
  ...PREMIUM_FEATURES,
];
