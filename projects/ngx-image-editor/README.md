# @ebdev/ngx-image-editor

Professional Angular image editor with layers, filters, drawing, and a
**free forever** core. Premium tools unlock with an offline signed license key.

## Install

```bash
npm install @ebdev/ngx-image-editor
```

Import styles once in your app:

```scss
@import '@ebdev/ngx-image-editor/styles.css';
```

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
| PNG / JPEG / WebP export | ✓ | ✓ |
| Brush & eraser | | ✓ |
| Masks, groups, blend modes | | ✓ |
| Advanced selections | | ✓ |
| Clone / healing | | ✓ |
| Perspective / warp | | ✓ |
| Layer styles, adjustment layers | | ✓ |
| Extended filters, SVG export | | ✓ |
| PSD / RAW / color management | | ✓ (phase 3) |

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Move / Text / Shape / Crop | `V` / `T` / `U` / `C` |
| Brush / Eraser | `B` / `E` |
| Undo / Redo | `Mod+Z` / `Mod+Shift+Z` |
| Cut / Copy / Paste / Duplicate | `Mod+X` / `Mod+C` / `Mod+V` / `Mod+D` |
| Delete | `Delete` |
| Pan (hold) | `Space` |
| Export / Open | `Mod+S` / `Mod+O` |

`Mod` is ⌘ on macOS and Ctrl on Windows/Linux. Override via
`provideImageEditor({ shortcuts })`.

## Theming

CSS variables on `.ngx-nie` / `.ngx-nie--dark`:

- `--nie-bg`, `--nie-surface`, `--nie-text`, `--nie-muted`
- `--nie-accent`, `--nie-accent-2`, `--nie-border`, `--nie-radius`

## License

Source-available. See the repository `LICENSE`. Free Features may be used in
commercial apps forever. Premium Features require a purchased key from
[ebdev-design.com](https://www.ebdev-design.com).
