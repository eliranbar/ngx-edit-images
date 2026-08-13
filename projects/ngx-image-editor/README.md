# @ebdev/ngx-image-editor

Professional Angular image editor with layers, filters, drawing, and a
**free forever** core. Premium tools unlock with an offline signed license key.

Homepage: [ngx-image-editor.ebdev-design.com](https://ngx-image-editor.ebdev-design.com/)

## Install

```bash
npm install @ebdev/ngx-image-editor
# Optional — required only for premium PDF import
npm install pdfjs-dist
```

Import styles once in your app:

```scss
@import '@ebdev/ngx-image-editor/styles.css';
```

For AVIF export, copy the packaged WASM encoder from
`node_modules/@ebdev/ngx-image-editor/assets` to
`assets/ngx-image-editor` with your application's build assets configuration.
If you serve it elsewhere, set `avifWasmUrl` in `provideImageEditor`.

## Quick start

```ts
import { provideImageEditor } from '@ebdev/ngx-image-editor';

export const appConfig = {
  providers: [
    provideImageEditor({
      // optional — free tier works without a key
      licenseKey: 'YOUR_KEY',
      theme: 'dark',
    }),
  ],
};
```

```ts
import { ImageEditorComponent } from '@ebdev/ngx-image-editor';

@Component({
  imports: [ImageEditorComponent],
  template: `
    <ngx-image-editor
      theme="dark"
      style="height: 640px"
      (exported)="onExported($event)"
    />
  `,
})
export class EditorPage {
  onExported(result: unknown) {
    console.log(result);
  }
}
```

## Free vs Premium

| Feature | Free | Premium |
| --- | --- | --- |
| Canvas, upload, drag & drop | ✓ | ✓ |
| Image / text / shape layers | ✓ | ✓ |
| Move, resize, rotate, crop | ✓ | ✓ |
| Zoom / pan, undo / redo | ✓ | ✓ |
| Layers panel, opacity | ✓ | ✓ |
| Basic filters | ✓ | ✓ |
| Guides, grid, alignment | ✓ | ✓ |
| PNG / JPEG / WebP / AVIF / GIF / TIFF export | ✓ | ✓ |
| Brush & eraser | | ✓ |
| Masks, groups, blend modes | | ✓ |
| Advanced selections | | ✓ |
| Clone / healing | | ✓ |
| Perspective / warp | | ✓ |
| Layer styles, adjustment layers | | ✓ |
| Extended filters, SVG export | | ✓ |
| PDF import (pages as images) | | ✓ |
| PSD / RAW / color management | | ✓ (phase 3) |

## Keyboard shortcuts

| Action | Shortcut | Alternative |
| --- | --- | --- |
| Move / Text / Shape / Crop | `V` / `T` / `U` / `C` | |
| Brush / Eraser | `B` / `E` | |
| Transform | `Mod+T` | `F` |
| Undo / Redo | `Mod+Z` / `Mod+Shift+Z` | |
| Cut / Copy / Paste / Duplicate | `Mod+X` / `Mod+C` / `Mod+V` / `Mod+D` | |
| Deselect | `Mod+Shift+A` | `Esc` |
| Toggle rulers | `Mod+R` | `R` |
| Delete | `Delete` | |
| Pan (hold) | `Space` | |
| Export / Open | `Mod+S` / `Mod+O` | |

`Mod` is ⌘ on macOS and Ctrl on Windows/Linux. Override via
`provideImageEditor({ shortcuts })`.

### macOS

Safari and Chrome keep `⌘T`, `⌘R` and `⌘⇧A` for themselves, so those actions have
alternatives that the page always receives (`F`, `R`, `Esc`). Both variants work on every
platform; on macOS the tooltips show the alternative.

Modifier-clicks accept **⌘ as well as ⌥** — that covers zoom out with the Zoom tool, magic
erase with the Eraser, and setting the source point for Clone and Healing. Tool tooltips are
written from the placeholders `{altClick}` / `{altDrag}` and rendered per platform, so a
custom `ToolbarItem` can use them too:

```ts
import { resolveModifierHints, isAltModifier } from 'ngx-image-editor';

resolveModifierHints('{altClick} to set source.'); // "⌥-click (or ⌘-click) to set source."
isAltModifier(pointerEvent); // true for ⌥-click, and for ⌘-click on macOS
```

Keyboard matching falls back to `KeyboardEvent.code`, so custom bindings that use `alt` still
resolve on macOS where ⌥ rewrites the produced character (⌥B yields `∫`).

## Theming

CSS variables on `.ngx-nie` / `.ngx-nie--dark`:

- `--nie-bg`, `--nie-surface`, `--nie-text`, `--nie-muted`
- `--nie-accent`, `--nie-accent-2`, `--nie-border`, `--nie-radius`

## License

Source-available. See the repository `LICENSE`. Free Features may be used in
commercial apps forever. Premium Features require a purchased key from
[ngx-image-editor.ebdev-design.com](https://ngx-image-editor.ebdev-design.com/).
