import { describe, it, expect } from 'vitest';
import { HistoryStack } from './history';
import type { Command } from './history';
import { EditorDocument } from './document';
import { createShapeLayer, defaultTransform } from './layers/types';
import { AddLayerCommand, TransformLayerCommand } from './commands';
import { ShortcutRegistry, DEFAULT_SHORTCUTS } from './shortcuts';
import { isAltModifier, resolveModifierHints, setMacPlatformOverride } from './platform';
import { ZoomTool } from './tools/view';
import type { ToolContext } from './tools/tool';
import { applyFilters } from './filters/apply';
import { createFilter } from './filters/types';
import { rectSelectionMask } from './selection';

describe('HistoryStack', () => {
  it('undoes and redoes commands', () => {
    let value = 0;
    const cmd: Command = {
      name: 'inc',
      do: () => {
        value += 1;
      },
      undo: () => {
        value -= 1;
      },
    };
    const history = new HistoryStack();
    history.execute(cmd);
    history.execute(cmd);
    expect(value).toBe(2);
    expect(history.undo()).toBe(true);
    expect(value).toBe(1);
    expect(history.redo()).toBe(true);
    expect(value).toBe(2);
  });
});

describe('EditorDocument', () => {
  it('adds and removes layers', () => {
    const doc = new EditorDocument(400, 300);
    const layer = createShapeLayer({
      name: 'Rect',
      shape: 'rect',
      transform: defaultTransform({ x: 10, y: 10, width: 100, height: 80 }),
    });
    doc.addLayer(layer);
    expect(doc.getLayers()).toHaveLength(1);
    expect(doc.activeLayerId).toBe(layer.id);
    doc.removeLayer(layer.id);
    expect(doc.getLayers()).toHaveLength(0);
  });

  it('duplicates active layer', () => {
    const doc = new EditorDocument();
    const layer = createShapeLayer({ name: 'A', shape: 'ellipse' });
    doc.addLayer(layer);
    const copy = doc.duplicateActiveLayer();
    expect(copy).toBeTruthy();
    expect(doc.getLayers()).toHaveLength(2);
    expect(copy!.name).toContain('copy');
  });
});

describe('Commands', () => {
  it('AddLayerCommand is undoable', () => {
    const doc = new EditorDocument();
    const history = new HistoryStack();
    const layer = createShapeLayer({ name: 'S', shape: 'star' });
    history.execute(new AddLayerCommand(doc, layer));
    expect(doc.getLayers()).toHaveLength(1);
    history.undo();
    expect(doc.getLayers()).toHaveLength(0);
  });

  it('TransformLayerCommand restores previous transform', () => {
    const doc = new EditorDocument();
    const layer = createShapeLayer({
      name: 'S',
      shape: 'rect',
      transform: defaultTransform({ x: 0, y: 0, width: 50, height: 50 }),
    });
    doc.addLayer(layer);
    const history = new HistoryStack();
    history.execute(
      new TransformLayerCommand(doc, layer.id, {
        ...layer.transform,
        x: 40,
        y: 20,
      }),
    );
    expect(doc.getLayer(layer.id)!.transform.x).toBe(40);
    history.undo();
    expect(doc.getLayer(layer.id)!.transform.x).toBe(0);
  });
});

describe('ShortcutRegistry', () => {
  it('matches Mod+Z as undo', () => {
    const registry = new ShortcutRegistry();
    const event = new KeyboardEvent('keydown', { key: 'z', metaKey: true });
    expect(registry.match(event)).toBe('edit.undo');
  });

  it('matches V as move tool', () => {
    const registry = new ShortcutRegistry();
    const event = new KeyboardEvent('keydown', { key: 'v' });
    expect(registry.match(event)).toBe('tool.move');
  });

  it('allows overriding a binding', () => {
    const registry = new ShortcutRegistry({
      'tool.move': { key: 'q', label: 'Q' },
    });
    expect(registry.match(new KeyboardEvent('keydown', { key: 'v' }))).toBeNull();
    expect(registry.match(new KeyboardEvent('keydown', { key: 'q' }))).toBe('tool.move');
  });

  it('exposes default bindings', () => {
    expect(DEFAULT_SHORTCUTS['edit.cut'].key).toBe('x');
    expect(DEFAULT_SHORTCUTS['edit.cut'].mod).toBe(true);
  });

  it('matches the Mac alternate as well as the primary chord', () => {
    const registry = new ShortcutRegistry();
    expect(registry.match(new KeyboardEvent('keydown', { key: 't', metaKey: true }))).toBe(
      'tool.transform',
    );
    expect(registry.match(new KeyboardEvent('keydown', { key: 'f' }))).toBe('tool.transform');
    expect(registry.match(new KeyboardEvent('keydown', { key: 'Escape' }))).toBe('edit.deselect');
  });

  it('falls back to the physical key when macOS rewrites Option combos', () => {
    const registry = new ShortcutRegistry({
      'tool.brush': { key: 'b', alt: true, label: 'Alt+B' },
    });
    const optionB = new KeyboardEvent('keydown', { key: '∫', code: 'KeyB', altKey: true });
    expect(registry.match(optionB)).toBe('tool.brush');
  });

  it('shows the Mac alternate in labels on macOS only', () => {
    const registry = new ShortcutRegistry();
    expect(registry.label('tool.transform', false)).toBe('Ctrl+T');
    expect(registry.label('tool.transform', true)).toBe('F');
    expect(registry.label('edit.undo', true)).toBe('⌘Z');
  });
});

describe('platform modifiers', () => {
  it('treats ⌘ as the alt modifier on macOS only', () => {
    const cmdClick = { altKey: false, metaKey: true };
    expect(isAltModifier(cmdClick, true)).toBe(true);
    expect(isAltModifier(cmdClick, false)).toBe(false);
    expect(isAltModifier({ altKey: true, metaKey: false }, false)).toBe(true);
  });

  it('zooms out on ⌘-click when running on macOS', () => {
    setMacPlatformOverride(true);
    try {
      const doc = new EditorDocument();
      const ctx = { doc, requestRender: () => {} } as unknown as ToolContext;
      const cmdClick = {
        x: 0,
        y: 0,
        screenX: 0,
        screenY: 0,
        button: 0,
        shiftKey: false,
        altKey: false,
        metaKey: true,
        pressure: 1,
      };
      new ZoomTool().pointerDown(cmdClick, ctx);
      expect(doc.viewport.zoom).toBeLessThan(1);
    } finally {
      setMacPlatformOverride(null);
    }
  });

  it('renders modifier hints per platform', () => {
    expect(resolveModifierHints('{altClick} to set source.', false)).toBe(
      'Alt-click to set source.',
    );
    expect(resolveModifierHints('{altClick} to set source.', true)).toBe(
      '⌥-click (or ⌘-click) to set source.',
    );
  });
});

describe('Filters', () => {
  it('applies brightness without throwing', () => {
    const raw = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < raw.length; i += 4) {
      raw[i] = 100;
      raw[i + 1] = 100;
      raw[i + 2] = 100;
      raw[i + 3] = 255;
    }
    const data = { data: raw, width: 4, height: 4, colorSpace: 'srgb' as const } as ImageData;
    applyFilters(data, [createFilter('brightness', 20)]);
    expect(raw[0]).toBe(120);
  });
});

describe('Selection', () => {
  it('builds a rectangular mask', () => {
    // Polyfill ImageData for Node/Vitest when missing
    if (typeof ImageData === 'undefined') {
      (globalThis as unknown as { ImageData: unknown }).ImageData = class {
        data: Uint8ClampedArray;
        width: number;
        height: number;
        constructor(data: Uint8ClampedArray, width: number, height?: number) {
          this.data = data;
          this.width = width;
          this.height = height ?? data.length / (4 * width);
        }
      };
    }
    const mask = rectSelectionMask(10, 10, 2, 2, 4, 4);
    expect(mask.width).toBe(10);
    expect(mask.data[(2 * 10 + 2) * 4 + 3]).toBe(255);
    expect(mask.data[(0) * 4 + 3]).toBe(0);
  });
});
