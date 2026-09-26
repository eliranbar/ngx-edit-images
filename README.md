# @ebdev/ngx-image-editor

A layered image editor for Angular that runs entirely in the browser — no image
backend, no uploads to a server, no telemetry.

[![npm version](https://img.shields.io/npm/v/@ebdev/ngx-image-editor)](https://www.npmjs.com/package/@ebdev/ngx-image-editor)
[![npm downloads](https://img.shields.io/npm/dm/@ebdev/ngx-image-editor)](https://www.npmjs.com/package/@ebdev/ngx-image-editor)
[![Angular](https://img.shields.io/badge/Angular-17%20--%2022-dd0031)](https://github.com/eliranbar/ngx-edit-images/blob/main/projects/ngx-image-editor/package.json)

**[Live demo](https://ngx-image-editor.ebdev-design.com/)** — the fastest way to
decide if this is what you need.

## Install

```bash
npm install @ebdev/ngx-image-editor
# Optional — required only for premium PDF import
npm install pdfjs-dist
```

Styles ship with the component — nothing to add to `angular.json` or your global
stylesheet. If you use the panel components on their own, without
`<ngx-image-editor>`, import the stylesheet yourself:

```scss
@import '@ebdev/ngx-image-editor/styles.css';
```

## Quick start

```ts
import { provideImageEditor } from '@ebdev/ngx-image-editor';

export const appConfig = {
  providers: [
    provideImageEditor({
      // optional — the free tier works without a key
      theme: 'dark',
    }),
  ],
};
```

```ts
import { Component } from '@angular/core';
import { ImageEditorComponent } from '@ebdev/ngx-image-editor';

@Component({
  imports: [ImageEditorComponent],
  template: `
    <ngx-image-editor theme="dark" style="height: 640px" (exported)="onExported($event)" />
  `,
})
export class EditorPage {
  onExported(result: unknown) {
    console.log(result);
  }
}
```

## Why this exists

Most image-editing features in web apps end up as a server round-trip: upload,
process, download. That costs infrastructure, latency, and a privacy
conversation you did not want to have. This editor keeps the entire pipeline —
layers, filters, transforms, export — on the client, in a single Angular
component. The trade-off is honest: very large images are bounded by browser
memory, and there is no server-side render fallback.

## Free vs Premium

| Feature                                      | Free | Premium     |
| -------------------------------------------- | ---- | ----------- |
| Canvas, upload, drag & drop                  | ✓    | ✓           |
| Image / text / shape layers                  | ✓    | ✓           |
| Move, resize, rotate, crop                   | ✓    | ✓           |
| Zoom / pan, undo / redo                      | ✓    | ✓           |
| Layers panel, opacity                        | ✓    | ✓           |
| Basic filters                                | ✓    | ✓           |
| Guides, grid, alignment                      | ✓    | ✓           |
| PNG / JPEG / WebP / AVIF / GIF / TIFF export | ✓    | ✓           |
| Brush                                        | ✓    | ✓           |
| Eraser                                       |      | ✓           |
| Masks, groups, blend modes                   |      | ✓           |
| Advanced selections                          |      | ✓           |
| Clone / healing                              |      | ✓           |
| Perspective / warp                           |      | ✓           |
| Layer styles, adjustment layers              |      | ✓           |
| Extended filters, SVG export                 |      | ✓           |
| PDF import (pages as images)                 |      | ✓           |
| PSD / RAW / color management                 |      | ✓ (phase 3) |

The free tier is a complete layered editor with raster export in six formats.
Premium adds the retouching toolset. Licensing is offline — an Ed25519-signed
key verified in the browser, domain-bound, with no license server and no
telemetry. If our infrastructure disappears tomorrow, your editor keeps working.

## Compatibility

Angular 17.3–22 (`@angular/common`, `@angular/core`, `@angular/forms`). Every major in
that range is built against in CI — see `npm run test:compat`.
`pdfjs-dist` (^4 or ^5) is an optional peer, needed only for PDF import.

## Documentation & links

- [Live demo](https://ngx-image-editor.ebdev-design.com/)
- [Package README](https://github.com/eliranbar/ngx-edit-images/blob/main/projects/ngx-image-editor/README.md) — full API, keyboard shortcuts, theming
- [npm](https://www.npmjs.com/package/@ebdev/ngx-image-editor)
- [License](https://github.com/eliranbar/ngx-edit-images/blob/main/LICENSE)

## Workspace

This repository is the Angular workspace for the package.

| Project            | Path                        | Description                   |
| ------------------ | --------------------------- | ----------------------------- |
| `ngx-image-editor` | `projects/ngx-image-editor` | Publishable library           |
| `demo`             | `projects/demo`             | Demo app behind the live demo |

```bash
npm start          # serve the demo
npm run build      # build the library
npm run build:demo # build the demo app
npm test           # unit tests (Vitest)
npm run e2e        # Playwright end-to-end
npm run pack:lib   # build + npm pack
```

License tooling lives under `tools/`; private keys are never published.

## License

See [LICENSE](https://github.com/eliranbar/ngx-edit-images/blob/main/LICENSE).
Free Features may be used forever, including in commercial applications.
Premium Features require a purchased license key.
