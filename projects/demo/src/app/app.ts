import { Component, signal } from '@angular/core';
import { ImageEditorComponent } from 'ngx-image-editor';

@Component({
  selector: 'app-root',
  imports: [ImageEditorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly badges = [
    'Angular 18–22',
    'Standalone + signals',
    'Free forever tier',
    'Offline license',
    'Zero canvas deps',
  ];

  readonly features = [
    { name: 'Drag & drop upload', tier: 'Free', desc: 'Drop images or use the upload button.' },
    { name: 'Layers', tier: 'Free', desc: 'Reorder, hide, lock, delete, duplicate.' },
    { name: 'Move / resize / rotate', tier: 'Free', desc: 'Transform any layer with handles.' },
    { name: 'Crop, zoom & pan', tier: 'Free', desc: 'Navigate the canvas with familiar shortcuts.' },
    { name: 'Text & shapes', tier: 'Free', desc: 'Rect, ellipse, line, arrow, polygon, star.' },
    { name: 'Basic filters', tier: 'Free', desc: 'Brightness, contrast, saturation, blur, and more.' },
    { name: 'Guides, grid, alignment', tier: 'Free', desc: 'Snap while you design.' },
    { name: 'PNG / JPEG / WebP export', tier: 'Free', desc: 'Download your composition.' },
    { name: 'Brush & eraser', tier: 'Premium', desc: 'Freehand drawing with pressure points.' },
    { name: 'Masks & groups', tier: 'Premium', desc: 'Non-destructive organization.' },
    { name: 'Blend modes', tier: 'Premium', desc: 'Multiply, screen, overlay, and more.' },
    { name: 'Advanced selections', tier: 'Premium', desc: 'Lasso and magic wand.' },
    { name: 'Clone & healing', tier: 'Premium', desc: 'Retouching tools.' },
    { name: 'Perspective & warp', tier: 'Premium', desc: 'Advanced transforms.' },
    { name: 'Adjustment layers', tier: 'Premium', desc: 'Non-destructive color grading.' },
    { name: 'PDF as images', tier: 'Premium', desc: 'Import PDF pages as editable image layers.' },
    { name: 'SVG / PSD / RAW', tier: 'Premium', desc: 'Pro interchange formats.' },
  ];

  readonly installCode = `npm install @ebdev/ngx-image-editor`;

  readonly setupCode = `import { provideImageEditor } from '@ebdev/ngx-image-editor';

export const appConfig = {
  providers: [
    provideImageEditor({
      licenseKey: 'YOUR_KEY', // optional — free tier works without it
      theme: 'dark',
    }),
  ],
};`;

  readonly templateCode = `import { ImageEditorComponent } from '@ebdev/ngx-image-editor';

@Component({
  imports: [ImageEditorComponent],
  template: \`
    <ngx-image-editor
      theme="dark"
      style="height: 640px"
      (exported)="onExported($event)"
    />
  \`,
})
export class EditorPage {}`;

  readonly theme = signal<'dark' | 'light'>('dark');

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
