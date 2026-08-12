import { isMacPlatform } from './platform';

export type ShortcutAction =
  | 'tool.move'
  | 'tool.transform'
  | 'tool.crop'
  | 'tool.text'
  | 'tool.shape'
  | 'tool.brush'
  | 'tool.eraser'
  | 'tool.select-rect'
  | 'tool.select-ellipse'
  | 'tool.lasso'
  | 'tool.magic-wand'
  | 'tool.clone'
  | 'tool.healing'
  | 'tool.eyedropper'
  | 'tool.fill'
  | 'tool.pan'
  | 'tool.zoom'
  | 'edit.undo'
  | 'edit.redo'
  | 'edit.cut'
  | 'edit.copy'
  | 'edit.paste'
  | 'edit.duplicate'
  | 'edit.delete'
  | 'edit.select-all'
  | 'edit.deselect'
  | 'layer.group'
  | 'layer.ungroup'
  | 'layer.bring-forward'
  | 'layer.send-backward'
  | 'layer.bring-to-front'
  | 'layer.send-to-back'
  | 'layer.merge-down'
  | 'transform.nudge-left'
  | 'transform.nudge-right'
  | 'transform.nudge-up'
  | 'transform.nudge-down'
  | 'transform.nudge-left-large'
  | 'transform.nudge-right-large'
  | 'transform.nudge-up-large'
  | 'transform.nudge-down-large'
  | 'transform.free'
  | 'view.zoom-in'
  | 'view.zoom-out'
  | 'view.fit'
  | 'view.actual'
  | 'view.toggle-grid'
  | 'view.toggle-guides'
  | 'view.toggle-rulers'
  | 'file.export'
  | 'file.open';

export interface ShortcutChord {
  /** Key from KeyboardEvent.key, lowercased for letters. */
  key: string;
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export interface ShortcutBinding extends ShortcutChord {
  /** Human label for tooltips, e.g. "⌘Z" / "Ctrl+Z". */
  label: string;
  /**
   * Extra chords that trigger the same action, used where macOS or its browsers
   * swallow the primary chord (⌘T, ⌘R, ⌘⇧A). They work on every platform, but on
   * macOS the first alternate is what gets shown in tooltips.
   */
  alternates?: ShortcutChord[];
}

export type ShortcutOverrides = Partial<Record<ShortcutAction, ShortcutBinding | null>>;

export const DEFAULT_SHORTCUTS: Record<ShortcutAction, ShortcutBinding> = {
  'tool.move': { key: 'v', label: 'V' },
  'tool.transform': { key: 't', mod: true, label: 'Mod+T', alternates: [{ key: 'f' }] },
  'tool.crop': { key: 'c', label: 'C' },
  'tool.text': { key: 't', label: 'T' },
  'tool.shape': { key: 'u', label: 'U' },
  'tool.brush': { key: 'b', label: 'B' },
  'tool.eraser': { key: 'e', label: 'E' },
  'tool.select-rect': { key: 'm', label: 'M' },
  'tool.select-ellipse': { key: 'm', shift: true, label: 'Shift+M' },
  'tool.lasso': { key: 'l', label: 'L' },
  'tool.magic-wand': { key: 'w', label: 'W' },
  'tool.clone': { key: 's', label: 'S' },
  'tool.healing': { key: 'j', label: 'J' },
  'tool.eyedropper': { key: 'i', label: 'I' },
  'tool.fill': { key: 'g', label: 'G' },
  'tool.pan': { key: 'h', label: 'H' },
  'tool.zoom': { key: 'z', label: 'Z' },
  'edit.undo': { key: 'z', mod: true, label: 'Mod+Z' },
  'edit.redo': { key: 'z', mod: true, shift: true, label: 'Mod+Shift+Z' },
  'edit.cut': { key: 'x', mod: true, label: 'Mod+X' },
  'edit.copy': { key: 'c', mod: true, label: 'Mod+C' },
  'edit.paste': { key: 'v', mod: true, label: 'Mod+V' },
  'edit.duplicate': { key: 'd', mod: true, label: 'Mod+D' },
  'edit.delete': { key: 'delete', label: 'Delete' },
  'edit.select-all': { key: 'a', mod: true, label: 'Mod+A' },
  'edit.deselect': {
    key: 'a',
    mod: true,
    shift: true,
    label: 'Mod+Shift+A',
    alternates: [{ key: 'escape' }],
  },
  'layer.group': { key: 'g', mod: true, label: 'Mod+G' },
  'layer.ungroup': { key: 'g', mod: true, shift: true, label: 'Mod+Shift+G' },
  'layer.bring-forward': { key: ']', mod: true, label: 'Mod+]' },
  'layer.send-backward': { key: '[', mod: true, label: 'Mod+[' },
  'layer.bring-to-front': { key: ']', mod: true, shift: true, label: 'Mod+Shift+]' },
  'layer.send-to-back': { key: '[', mod: true, shift: true, label: 'Mod+Shift+[' },
  'layer.merge-down': { key: 'e', mod: true, label: 'Mod+E' },
  'transform.nudge-left': { key: 'arrowleft', label: '←' },
  'transform.nudge-right': { key: 'arrowright', label: '→' },
  'transform.nudge-up': { key: 'arrowup', label: '↑' },
  'transform.nudge-down': { key: 'arrowdown', label: '↓' },
  'transform.nudge-left-large': { key: 'arrowleft', shift: true, label: 'Shift+←' },
  'transform.nudge-right-large': { key: 'arrowright', shift: true, label: 'Shift+→' },
  'transform.nudge-up-large': { key: 'arrowup', shift: true, label: 'Shift+↑' },
  'transform.nudge-down-large': { key: 'arrowdown', shift: true, label: 'Shift+↓' },
  'transform.free': { key: 't', mod: true, label: 'Mod+T', alternates: [{ key: 'f' }] },
  'view.zoom-in': { key: '=', mod: true, label: 'Mod++' },
  'view.zoom-out': { key: '-', mod: true, label: 'Mod+-' },
  'view.fit': { key: '0', mod: true, label: 'Mod+0' },
  'view.actual': { key: '1', mod: true, label: 'Mod+1' },
  'view.toggle-grid': { key: "'", mod: true, label: "Mod+'" },
  'view.toggle-guides': { key: ';', mod: true, label: 'Mod+;' },
  'view.toggle-rulers': { key: 'r', mod: true, label: 'Mod+R', alternates: [{ key: 'r' }] },
  'file.export': { key: 's', mod: true, label: 'Mod+S' },
  'file.open': { key: 'o', mod: true, label: 'Mod+O' },
};

function normalizeKey(key: string): string {
  if (key === 'Backspace') return 'delete';
  if (key === '+' || key === 'Add') return '=';
  return key.toLowerCase();
}

const CODE_KEYS: Record<string, string> = {
  Minus: '-',
  NumpadSubtract: '-',
  Equal: '=',
  NumpadAdd: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Quote: "'",
  Semicolon: ';',
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backslash: '\\',
  Backquote: '`',
  Delete: 'delete',
  Backspace: 'delete',
  Escape: 'escape',
  Enter: 'enter',
  NumpadEnter: 'enter',
  ArrowLeft: 'arrowleft',
  ArrowRight: 'arrowright',
  ArrowUp: 'arrowup',
  ArrowDown: 'arrowdown',
};

/**
 * Physical key for an event. macOS rewrites `KeyboardEvent.key` when Option is held
 * (⌥T yields "†"), so the code is the only reliable source for Alt combos there. Only
 * consulted while Alt is down, otherwise non-US layouts would match the wrong binding.
 */
function keyFromCode(code: string | undefined): string | null {
  if (!code) return null;
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (/^(Digit|Numpad)[0-9]$/.test(code)) return code.slice(-1);
  return CODE_KEYS[code] ?? null;
}

function isModPressed(e: KeyboardEvent): boolean {
  return e.metaKey || e.ctrlKey;
}

const KEY_LABELS: Record<string, string> = {
  delete: 'Del',
  escape: 'Esc',
  enter: '↩',
  arrowleft: '←',
  arrowright: '→',
  arrowup: '↑',
  arrowdown: '↓',
};

export function formatShortcutLabel(chord: ShortcutChord, isMac = false): string {
  const parts: string[] = [];
  if (chord.mod) parts.push(isMac ? '⌘' : 'Ctrl');
  if (chord.shift) parts.push(isMac ? '⇧' : 'Shift');
  if (chord.alt) parts.push(isMac ? '⌥' : 'Alt');
  const key = chord.key.length === 1 ? chord.key.toUpperCase() : chord.key;
  parts.push(KEY_LABELS[chord.key] ?? key);
  return parts.join(isMac ? '' : '+');
}

/** Every chord that triggers the binding, primary first. */
export function shortcutChords(binding: ShortcutBinding): ShortcutChord[] {
  return [binding, ...(binding.alternates ?? [])];
}

export class ShortcutRegistry {
  private map: Record<ShortcutAction, ShortcutBinding | null>;

  constructor(overrides: ShortcutOverrides = {}) {
    this.map = { ...DEFAULT_SHORTCUTS };
    for (const [action, binding] of Object.entries(overrides) as [
      ShortcutAction,
      ShortcutBinding | null,
    ][]) {
      this.map[action] = binding;
    }
  }

  get(action: ShortcutAction): ShortcutBinding | null {
    return this.map[action] ?? null;
  }

  /** Chord shown to the user — the Mac-friendly alternate wins on macOS. */
  chord(action: ShortcutAction, isMac = isMacPlatform()): ShortcutChord | null {
    const b = this.get(action);
    if (!b) return null;
    return isMac && b.alternates?.length ? b.alternates[0] : b;
  }

  label(action: ShortcutAction, isMac = isMacPlatform()): string {
    const chord = this.chord(action, isMac);
    return chord ? formatShortcutLabel(chord, isMac) : '';
  }

  /** Match a keyboard event to an action. More specific (mod/shift) bindings win. */
  match(e: KeyboardEvent): ShortcutAction | null {
    const mod = isModPressed(e);
    const shift = e.shiftKey;
    const alt = e.altKey;

    const keys = new Set([normalizeKey(e.key)]);
    const physical = alt ? keyFromCode(e.code) : null;
    if (physical) keys.add(physical);

    let best: ShortcutAction | null = null;
    let bestScore = -1;

    for (const [action, binding] of Object.entries(this.map) as [
      ShortcutAction,
      ShortcutBinding | null,
    ][]) {
      if (!binding) continue;
      for (const chord of shortcutChords(binding)) {
        if (!keys.has(normalizeKey(chord.key))) continue;
        if (!!chord.mod !== mod) continue;
        if (!!chord.shift !== shift) continue;
        if (!!chord.alt !== alt) continue;
        const score = (chord.mod ? 4 : 0) + (chord.shift ? 2 : 0) + (chord.alt ? 1 : 0);
        if (score > bestScore) {
          bestScore = score;
          best = action;
        }
      }
    }
    return best;
  }
}
