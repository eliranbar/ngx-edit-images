#!/usr/bin/env node
/**
 * Builds the packed library against every Angular major we claim to support.
 *
 * Partial-compiled libraries ship their templates as source strings, so the
 * *consumer's* compiler parses them. Anything newer than the oldest supported
 * Angular — arrow functions in templates, `@let`, template literals — compiles
 * fine here and explodes in a downstream app. Only a real build per major
 * catches that, so this runs one.
 *
 * Usage: node tools/compat-matrix.mjs [major...]      (default: 17 18 19 20 21 22)
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist', 'ngx-image-editor');
const WORK = process.env['COMPAT_WORKDIR'] ?? join(tmpdir(), 'nie-compat');
const MAJORS = process.argv.slice(2).length ? process.argv.slice(2) : ['17', '18', '19', '20', '21', '22'];

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: 'pipe', maxBuffer: 64 * 1024 * 1024 });

/** peerDependencies of the newest release matching `^major`. */
function peersOf(pkg, major) {
  const raw = JSON.parse(run('npm', ['view', `${pkg}@^${major}.0.0`, 'peerDependencies', '--json']));
  return Array.isArray(raw) ? raw.at(-1) : raw;
}

/** Lower bound of a peer range: ">=5.8 <6.0" -> "~5.8.0", so we test the oldest supported peer. */
function lowerBound(spec, fallback) {
  const m = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(spec ?? '');
  return m ? `~${m[1]}.${m[2]}.${m[3] ?? '0'}` : fallback;
}

function scaffold(dir, major, tarball) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'src'), { recursive: true });

  const modern = Number(major) >= 18; // @angular/build only exists from 18.2
  const builder = modern ? '@angular/build:application' : '@angular-devkit/build-angular:application';
  const ts = lowerBound(peersOf('@angular/compiler-cli', major)?.['typescript'], 'latest');
  // zone.js is peer-pinned tightly per major (~0.14 for v17/18, ~0.15 later) — let Angular pick.
  const zone = lowerBound(peersOf('@angular/core', major)?.['zone.js'], '~0.15.0');

  const devDeps = {
    '@angular/cli': `^${major}.0.0`,
    '@angular/compiler-cli': `^${major}.0.0`,
    typescript: ts,
    ...(modern ? { '@angular/build': `^${major}.0.0` } : { '@angular-devkit/build-angular': `^${major}.0.0` }),
  };

  writeFileSync(join(dir, 'package.json'), JSON.stringify({
    name: `compat-ng${major}`, version: '0.0.0', private: true,
    scripts: { build: 'ng build' },
    dependencies: {
      '@angular/common': `^${major}.0.0`,
      '@angular/compiler': `^${major}.0.0`,
      '@angular/core': `^${major}.0.0`,
      '@angular/forms': `^${major}.0.0`,
      '@angular/platform-browser': `^${major}.0.0`,
      rxjs: '~7.8.0', tslib: '^2.3.0', 'zone.js': zone,
    },
    devDependencies: devDeps,
  }, null, 2));

  writeFileSync(join(dir, 'angular.json'), JSON.stringify({
    $schema: './node_modules/@angular/cli/lib/config/schema.json',
    version: 1,
    projects: {
      app: {
        projectType: 'application', root: '', sourceRoot: 'src', prefix: 'app',
        architect: {
          build: {
            builder,
            options: {
              outputPath: 'dist/app', index: 'src/index.html', browser: 'src/main.ts',
              tsConfig: 'tsconfig.app.json', polyfills: ['zone.js'], assets: [], styles: [],
            },
          },
        },
      },
    },
  }, null, 2));

  writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({
    compileOnSave: false,
    compilerOptions: {
      strict: true, noImplicitOverride: true, noPropertyAccessFromIndexSignature: true,
      noImplicitReturns: true, noFallthroughCasesInSwitch: true, skipLibCheck: true,
      isolatedModules: true, experimentalDecorators: true, moduleResolution: 'bundler',
      importHelpers: true, target: 'ES2022', module: 'ES2022', lib: ['ES2022', 'dom'],
    },
    angularCompilerOptions: {
      strictInjectionParameters: true, strictInputAccessModifiers: true, strictTemplates: true,
    },
  }, null, 2));

  writeFileSync(join(dir, 'tsconfig.app.json'), JSON.stringify({
    extends: './tsconfig.json',
    compilerOptions: { outDir: './out-tsc/app', types: [] },
    files: ['src/main.ts'],
  }, null, 2));

  writeFileSync(join(dir, 'src/index.html'),
    '<!doctype html><html><head><meta charset="utf-8"><title>compat</title></head><body><app-root></app-root></body></html>');

  // Touch every exported component so each template is linked and parsed.
  writeFileSync(join(dir, 'src/main.ts'), `import { bootstrapApplication } from '@angular/platform-browser';
import { Component } from '@angular/core';
import {
  ImageEditorComponent, NieToolbarComponent, NieLayersPanelComponent,
  NiePropertiesPanelComponent, NieRulerGuidesComponent, NieContextMenuComponent,
  provideImageEditor, exportDocument, downloadExport, isPdfFile, inspectPdf,
  rasterizePdfPages, createFilter, createImageLayer, createTextLayer, createShapeLayer,
  createDrawingLayer, createGroupLayer, createAdjustmentLayer, ImageEditorEngine,
  EditorDocument, HistoryStack, ShortcutRegistry, LicenseService, FeatureGateService,
  formatShortcutLabel, shortcutChords, isMacPlatform, resolveModifierHints,
} from '@ebdev/ngx-image-editor';

@Component({
  selector: 'app-root',
${Number(major) < 19 ? '  standalone: true,' : '  // standalone is the default from v19'}
  imports: [
    ImageEditorComponent, NieToolbarComponent, NieLayersPanelComponent,
    NiePropertiesPanelComponent, NieRulerGuidesComponent, NieContextMenuComponent,
  ],
  template: \`<ngx-image-editor theme="dark" style="height:640px" />\`,
})
export class App {
  readonly api = [
    exportDocument, downloadExport, isPdfFile, inspectPdf, rasterizePdfPages,
    createFilter, createImageLayer, createTextLayer, createShapeLayer,
    createDrawingLayer, createGroupLayer, createAdjustmentLayer, ImageEditorEngine,
    EditorDocument, HistoryStack, ShortcutRegistry, LicenseService, FeatureGateService,
    formatShortcutLabel, shortcutChords, isMacPlatform, resolveModifierHints,
  ];
}

bootstrapApplication(App, { providers: [provideImageEditor({ theme: 'dark' })] });
`);

  return { builder, ts, zone, tarball };
}

// ---- build + pack the library once -------------------------------------------------
console.log('Building library…');
run('npx', ['ng', 'build', 'ngx-image-editor'], ROOT);
mkdirSync(WORK, { recursive: true });
for (const f of readdirSync(WORK)) if (f.endsWith('.tgz')) rmSync(join(WORK, f));
run('npm', ['pack', DIST, '--pack-destination', WORK], ROOT);
const tarball = join(WORK, readdirSync(WORK).find((f) => f.endsWith('.tgz')));
console.log(`Packed ${tarball}\n`);

const results = [];
for (const major of MAJORS) {
  const dir = join(WORK, `ng${major}`);
  process.stdout.write(`Angular ${major}: scaffolding… `);
  let meta;
  try {
    meta = scaffold(dir, major, tarball);
  } catch (err) {
    results.push({ major, ok: false, stage: 'scaffold', msg: String(err.message).slice(0, 400) });
    console.log('FAILED (scaffold)');
    continue;
  }
  process.stdout.write(`installing (ts ${meta.ts}, zone ${meta.zone})… `);
  try {
    run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], dir);
    run('npm', ['install', tarball, '--no-audit', '--no-fund', '--loglevel=error'], dir);
  } catch (err) {
    const msg = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim() || String(err.message);
    results.push({ major, ok: false, stage: 'install', msg: msg.slice(-1500) });
    console.log('FAILED (install)');
    continue;
  }
  process.stdout.write('building… ');
  try {
    run('npx', ['ng', 'build'], dir);
    const actual = JSON.parse(run('node', ['-p', 'JSON.stringify(require("./node_modules/@angular/core/package.json").version)'], dir));
    results.push({ major, ok: true, actual });
    console.log(`PASS (@angular/core ${actual})`);
  } catch (err) {
    const msg = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim() || String(err.message);
    results.push({ major, ok: false, stage: 'build', msg: msg.slice(-3000) });
    console.log('FAILED (build)');
  }
}

console.log('\n================ COMPAT MATRIX ================');
for (const r of results) {
  console.log(r.ok ? `  ✔ Angular ${r.major}  (${r.actual})` : `  ✘ Angular ${r.major}  [${r.stage}]`);
}
const failed = results.filter((r) => !r.ok);
for (const r of failed) console.log(`\n--- Angular ${r.major} ${r.stage} output ---\n${r.msg}`);
console.log('==============================================');
process.exit(failed.length ? 1 : 0);
