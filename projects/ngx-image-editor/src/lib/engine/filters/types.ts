export type FilterType =
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'hue'
  | 'blur'
  | 'sharpen'
  | 'grayscale'
  | 'sepia'
  | 'invert'
  | 'pixelate'
  | 'vignette'
  | 'noise'
  | 'temperature'
  | 'exposure'
  | 'duotone';

export interface FilterDescriptor {
  id: string;
  type: FilterType;
  /** Amount / strength. Meaning depends on filter type. */
  amount: number;
  enabled: boolean;
  /** Extra options (e.g. duotone colors). */
  options?: Record<string, string | number>;
}

let filterSeq = 1;
export function createFilter(
  type: FilterType,
  amount = 0,
  options?: Record<string, string | number>,
): FilterDescriptor {
  return {
    id: `flt_${filterSeq++}`,
    type,
    amount,
    enabled: true,
    options,
  };
}

export const BASIC_FILTER_TYPES: readonly FilterType[] = [
  'brightness',
  'contrast',
  'saturation',
  'hue',
  'blur',
  'sharpen',
  'grayscale',
  'sepia',
  'invert',
];

export const EXTENDED_FILTER_TYPES: readonly FilterType[] = [
  'pixelate',
  'vignette',
  'noise',
  'temperature',
  'exposure',
  'duotone',
];
