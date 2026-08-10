export interface Guide {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: number;
}

export interface SnapSettings {
  enabled: boolean;
  gridSize: number;
  showGrid: boolean;
  showGuides: boolean;
  showRulers: boolean;
  snapToGrid: boolean;
  snapToGuides: boolean;
  snapToLayers: boolean;
  threshold: number;
}

export const DEFAULT_SNAP_SETTINGS: SnapSettings = {
  enabled: true,
  gridSize: 16,
  showGrid: false,
  showGuides: true,
  showRulers: true,
  snapToGrid: true,
  snapToGuides: true,
  snapToLayers: true,
  threshold: 6,
};

export function snapValue(
  value: number,
  targets: number[],
  threshold: number,
): { value: number; snapped: boolean; target?: number } {
  let best = value;
  let bestDist = threshold + 1;
  let target: number | undefined;
  for (const t of targets) {
    const d = Math.abs(value - t);
    if (d < bestDist) {
      bestDist = d;
      best = t;
      target = t;
    }
  }
  return bestDist <= threshold
    ? { value: best, snapped: true, target }
    : { value, snapped: false };
}

export function gridTargets(size: number, canvasSize: number): number[] {
  const out: number[] = [];
  for (let v = 0; v <= canvasSize; v += size) out.push(v);
  return out;
}
