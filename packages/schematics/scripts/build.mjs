import { build } from 'esbuild';
import { cpSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });

// @ng-icon-forge/core is a workspace-only package (version "0.0.0", never published) — bundling
// it directly into the schematic's output means the published "ng-icon-forge" package has no
// runtime dependency on it. Everything else stays external: they're real npm packages a consumer
// resolves normally from node_modules (and, for @angular-devkit/schematics in particular, we want
// whatever version the user's Angular CLI toolchain already provides, not a bundled copy that
// could drift from it).
await build({
  entryPoints: ['src/ng-add/index.ts'],
  outfile: 'dist/ng-add/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  sourcemap: true,
  external: [
    '@angular-devkit/schematics',
    '@schematics/angular/utility',
    '@resvg/resvg-wasm',
    'parse5-html-rewriting-stream',
  ],
});

cpSync('src/ng-add/schema.json', 'dist/ng-add/schema.json');
