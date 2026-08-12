/**
 * Platform helpers used to keep Alt-based interactions usable on macOS, where the
 * key is labelled ⌥ (Option) and some Option-clicks never reach the page.
 */

export interface ModifierState {
  altKey: boolean;
  metaKey: boolean;
}

let cachedIsMac: boolean | null = null;

function detectMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  const platform = uaData?.platform || navigator.platform || navigator.userAgent || '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}

export function isMacPlatform(): boolean {
  if (cachedIsMac === null) cachedIsMac = detectMac();
  return cachedIsMac;
}

/** Force the detected platform (pass `null` to fall back to detection). */
export function setMacPlatformOverride(value: boolean | null): void {
  cachedIsMac = value;
}

/** True when a pointer interaction carries the "alt" modifier — ⌘ counts on macOS. */
export function isAltModifier(e: ModifierState, isMac = isMacPlatform()): boolean {
  return e.altKey || (isMac && e.metaKey);
}

export function altClickLabel(isMac = isMacPlatform()): string {
  return isMac ? '⌥-click (or ⌘-click)' : 'Alt-click';
}

export function altDragLabel(isMac = isMacPlatform()): string {
  return isMac ? '⌥-drag (or ⌘-drag)' : 'Alt-drag';
}

/**
 * Replaces `{altClick}` / `{altDrag}` placeholders in UI copy with the wording that
 * matches the current platform.
 */
export function resolveModifierHints(text: string, isMac = isMacPlatform()): string {
  return text
    .replace(/\{altClick\}/g, () => altClickLabel(isMac))
    .replace(/\{altDrag\}/g, () => altDragLabel(isMac));
}
