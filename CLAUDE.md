# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

`packages/core`, `packages/schematics`, and `packages/ui` are all scaffolded and implemented
(milestones 1–3 and most of 5–6 of `BRIEF.md` §7 — functional drag-drop/preview/download, Material
3 theming, maskable safe-zone overlay, PWA-ify). Not done yet: `skill/SKILL.md`, actually publishing
`ng-icon-forge` to npm, and deploying `ui` to GitHub Pages (the CI/hosting side of milestone 6).
Treat `BRIEF.md` as the source of truth for what's still to build, but don't assume every path it
mentions already exists — check first.

## Commands

Root-level (runs across all workspaces that define the script):
```
npm install          # installs once for the whole monorepo (npm workspaces)
npm run build         # tsc build for every package
npm run typecheck      # tsc --noEmit for every package
npm run test           # vitest run for every package (schematics rebuilds dist first, see below)
```

Per-package (run from `packages/core` or `packages/schematics`):
```
npx vitest run                      # run that package's tests
npx vitest run test/foo.test.ts     # run a single test file
npx tsc -p tsconfig.json --noEmit   # typecheck only that package
```

`packages/schematics` tests run against **compiled `dist/`** output (the schematics engine loads
the factory as JS via `collection.json`, not TS directly) — its `test` script has a `pretest` that
runs `npm run build` first. If you edit schema.json/collection.json/source and tests don't pick up
the change, check `dist/` was rebuilt.

`packages/schematics`'s `build` script (`scripts/build.mjs`) bundles `src/ng-add/index.ts` with
**esbuild**, not plain `tsc` — deliberately, so `@ng-icon-forge/core` (a workspace-only package,
version `"0.0.0"`, never published) gets inlined directly into `dist/ng-add/index.js` rather than
staying an external import. Without this, the published `ng-icon-forge` package would declare a
runtime dependency nothing on the public registry could satisfy. Everything else genuinely external
(`@angular-devkit/schematics`, `@schematics/angular/utility`, `@resvg/resvg-wasm`,
`parse5-html-rewriting-stream`) is passed as an esbuild `external` and stays a real
`dependencies` entry, resolved normally from the consumer's own `node_modules` — in
`@angular-devkit/schematics`'s case specifically so it resolves to whatever version the user's own
Angular CLI toolchain provides, not a bundled copy that could drift from it. `@ng-icon-forge/core`
itself moved from `dependencies` to `devDependencies` in `packages/schematics/package.json`
accordingly — it's a build-time/typecheck-time-only input now, never a runtime one. If you add a
new import to schematics' source, check whether it needs adding to the `external` list in
`scripts/build.mjs` (anything that should stay a real npm dependency does) or should be left alone
to get bundled (only true for other future workspace-only packages, if any).

Verifying this stays broken-dependency-free isn't optional — `npm pack --dry-run` alone doesn't
catch it, since workspace symlinks make `@ng-icon-forge/core` resolvable locally even if the
published tarball's `package.json` doesn't declare it. The real test: `npm pack`, `npm install
<tarball>` into a directory with no relation to this monorepo (so there's no workspace symlink to
fall back on), and run the resulting `collection.json` schematic against a real scaffolded
project. That's what caught this issue in the first place and is worth repeating after any change
to schematics' dependencies.

To sanity-check the schematic against a real Angular workspace (beyond the fixture-tree unit
tests): scaffold a throwaway app with `npx @angular/cli new <name> --skip-install --skip-git`,
`npm install`, `npx ng add @angular/pwa` (so manifest/ngsw-config/service-worker exist), then run
`npx ng generate <path-to>/packages/schematics/collection.json:ng-add --svg <path-to-svg> --dry-run`
from inside it. `ng generate` accepts a direct filesystem path to a `collection.json` as the
collection specifier — no need to `npm link` or publish anything first.

`packages/ui` (run from `packages/ui`):
```
npm start            # copy-wasm, then ng serve — dev server at http://localhost:4200
npm run build          # copy-wasm, then ng build — output in dist/ui/browser
npm run test            # ng test (vitest under the hood)
npm run typecheck        # tsc -p tsconfig.app.json --noEmit
```
`copy-wasm` (`package.json`'s `prestart`/`prebuild`) copies `@resvg/resvg-wasm`'s `index_bg.wasm`
from the hoisted root `node_modules` into `public/index_bg.wasm` before every serve/build — Angular's
asset pipeline refuses `input` paths outside the project root (tried `../../node_modules/...` in
`angular.json`'s `assets` array first; it hard-errors with "asset path must be within the workspace
root"), so this copy-then-glob-`public/**/*` approach is the actual working fix, not a stylistic
choice. `public/index_bg.wasm` is gitignored — it's a build artifact, regenerated by the script.
There's no browser-automation tool wired into this environment by default; when you need to actually
exercise the app (drag-drop/render/download), Playwright works (`npm install playwright` + `npx
playwright install-deps chromium` the first time, `sudo` required for the OS deps) against a running
`ng serve` — that combination is how this app's UI was actually verified end-to-end, not just
typechecked/built.

## What this project is

`ng-icon-forge` generates the full set of Angular PWA icon assets (manifest icons in `any` and
`maskable` purposes, favicons, Apple touch icons) from a single source SVG, and merges them into an
existing Angular workspace's `public/icons/`, `manifest.webmanifest`, `ngsw-config.json`, and
`index.html` `<head>` tags.

The primary interface is `ng add ng-icon-forge --svg ./logo.svg`, run either by a human or by a
coding agent's normal shell access — there is deliberately no MCP server, no standalone CLI binary,
and no hosted endpoint. `--dry-run` is provided free by the Angular CLI's schematic tooling, so no
custom diff/preview mechanism should be built. A secondary Angular UI provides drag-drop/preview/ZIP
download for non-workspace or non-CLI use, hosted statically (GitHub Pages) with everything
rendered client-side — no SVG ever leaves the user's machine in either mode.

## Planned architecture (npm workspaces monorepo)

```
packages/
  core/         # pure TS: SVG rasterization via @resvg/resvg-wasm, no I/O, no Angular/Tree knowledge
  schematics/   # published npm package "ng-icon-forge" — the ng-add schematic
  ui/           # Angular 22 + Material 3 expressive app, installable PWA
skill/
  SKILL.md      # documents the `npx ng add ng-icon-forge --svg <path>` invocation for agents
```

**`core` is the single source of truth for "what goes where."** It exports a pure function
`renderIconSet(svgBuffer, config) -> Map<relativePath, Uint8Array>` plus plain-data descriptions of
the manifest icons array/colors (`getManifestIcons`/`getManifestColors`), the ngsw-config
`assetGroups` entry shape (`getNgswIconAssetGroup` — also reused by `schematics`' own ngsw merge, not
just `ui`'s ZIP fragment), and the head-tag snippet (`getHeadSnippet`). Both `schematics` (via `Tree`
writes, converting to `Buffer` right at that call site) and `ui` (via ZIP writes) consume this same
data — the icon-generation logic must never be duplicated between them, only the write mechanism
differs. **Values are plain `Uint8Array`, never Node's `Buffer`** — `core` has no Node dependency and
must run identically in the browser; the earlier `ico.ts` draft used `Buffer` internally and it
silently would have broken `ui` (no polyfill loaded) had it shipped that way, so don't reintroduce
`Buffer` inside `packages/core/src`. `core` also has no dependency on `@angular-devkit/*`.

Icon set: sizes 72/96/128/144/152/192/384/512 at `purpose: "any"`, plus 192/512 `maskable` variants
with configurable safe-zone padding (default 20%, per Android adaptive-icon spec — content must stay
within the inner ~66% to survive circle/squircle masking). Also `favicon.ico` (multi-res
16/32/48, hand-encoded — PNG-in-ICO packing, no extra dependency needed since modern OSes/browsers
accept PNG image data inside ICO directory entries) and `apple-touch-icon.png` (180×180, flattened
onto a solid background via resvg's own `background` render option since iOS ignores alpha).
Maskable icons are built by **wrapping the source SVG's inner markup in a fresh nested `<svg>`**
(background rect + a positioned/scaled nested viewport reproducing the original `viewBox`) before
rasterizing — pure vector composition, no raster/pixel manipulation needed. `renderIconSet`'s
returned Map keys are namespaced under a generic `public/` prefix regardless of consumer; each
consumer remaps that prefix onto its real target directory (see `schematics` below).

**`schematics`** is the actual published package (`ng-icon-forge`, from `packages/schematics`). Its
`ng-add` `Rule` (`src/ng-add/index.ts`):
1. Reads the source SVG from disk (outside the `Tree` — it's an external input) and calls
   `core.renderIconSet`, after lazily loading resvg's WASM bytes itself via `fs.readFileSync` +
   `require.resolve('@resvg/resvg-wasm/index_bg.wasm')` — `core` stays I/O-free by design, so each
   consumer is responsible for supplying the wasm bytes appropriately for its environment.
2. Resolves the target project's real paths (`utils/project-paths.ts`, via
   `@schematics/angular/utility`'s `readWorkspace`) — `public/` dir, `manifest.webmanifest`,
   `ngsw-config.json`, and `index.html`, correctly handling both single- and multi-project
   workspaces. An optional `--project` option is auto-filled by the Angular CLI via schema.json's
   `"$default": {"$source": "projectName"}`; if omitted and the workspace has more than one
   project, the Rule throws asking for it explicitly rather than guessing.
3. Writes each generated icon (remapped from `core`'s generic `public/` prefix onto the resolved
   project's actual public dir) via `tree.exists(path) ? tree.overwrite : tree.create`.
4. Merges `manifest.webmanifest` (`utils/manifest.ts`): full read/parse/replace-icons-array
   (+ `theme_color`/`background_color`)/overwrite. A full-file rewrite is intentional and
   considered safe here specifically because `Tree` writes are staged and reviewable via
   `--dry-run` — don't second-guess this into a partial-patch approach. Throws a clear error if
   manifest.webmanifest doesn't exist yet, pointing at `ng add @angular/pwa` — this tool keeps an
   *existing* PWA setup's icons in sync, it doesn't bootstrap one from scratch.
5. Merges `ngsw-config.json` (`utils/ngsw-config.ts`): rather than editing whichever pre-existing
   `assetGroups` entry looks "relevant" (fragile — real ngsw-config.json commonly already has
   overlapping glob-based groups), it maintains **one dedicated group named
   `"ng-icon-forge-icons"`**, `unshift`ed to the front of the array so it deterministically owns
   these exact paths (`@angular/service-worker`'s config generator resolves resource ownership
   first-match-wins across `assetGroups` in array order — no error on overlapping glob/literal
   matches between groups, so this is safe). Every other group is left provably untouched. Same
   "must already exist" contract as the manifest step.
6. Inserts/replaces favicon, apple-touch-icon, and theme-color `<head>` tags
   (`utils/index-html.ts`) using `parse5-html-rewriting-stream` — the same streaming-rewriter
   library `@angular/pwa`'s own `ng-add` schematic uses for `index.html`, not hand-rolled
   string/regex patching. Matched tags are dropped on the way through and a fresh canonical copy
   is emitted once before `</head>`, which is what makes re-running the schematic idempotent
   instead of appending duplicates.
7. Returns the modified `Tree` — the Angular CLI itself handles dry-run diffing, confirmation, and
   commit; no bespoke preview/patch code belongs in this project.

Tested with `SchematicTestRunner` against a fixture workspace `Tree`
(`packages/schematics/test/`), per the standard Angular schematics testing pattern. The fixtures
(`test/fixtures/angular.json`, `ngsw-config.json`, `manifest.webmanifest`, `index.html`) were
captured verbatim from a real `npx @angular/cli new` + `npx ng add @angular/pwa` run rather than
hand-guessed, so the merge logic is exercised against the genuine shape of those files. One real
end-to-end `ng generate <path>/collection.json:ng-add --dry-run` run against such a scaffolded
project was also used as a manual integration check (see Commands above) — worth repeating after
any change to the merge utilities, since it catches real Angular-CLI-formatting/workspace-parsing
behavior the fixture tests can't.

**`ui`** (`packages/ui`) is an Angular 22 app, scaffolded via `ng new` + `ng add @angular/material`
(M3 theming via the `mat.theme()` Sass mixin, `azure`/`blue` palettes) + `ng add @angular/pwa`, using
Signals for all state (no NgRx/RxJS state, no `FormsModule`/`ngModel` — plain native `(input)`/
`(change)` event bindings into signals). Zoneless by default (Angular 22's `ng new` default — no
`zone.js` dependency); `@angular/animations` had to be added by hand since `ng add @angular/material
--animations=enabled` didn't actually wire `provideAnimationsAsync()` into `app.config.ts` despite
the flag.
- `IconForgeService` (`src/app/icon-forge.service.ts`) owns the one-time `core.initWasm()` call,
  exposed as a `wasmReady` signal — it fetches `index_bg.wasm` as a same-origin relative URL (see
  the `copy-wasm` build step under Commands above).
- `App` (`src/app/app.ts`) holds the signal state (loaded SVG, app name, background, maskable
  padding, safe-zone toggle) and an `effect()` that re-renders via `iconForge.render()` whenever any
  input signal changes, once wasm is ready — deliberately an `effect`, not a `computed`, since it
  needs try/catch around a call that can throw on malformed SVG input and set an error signal rather
  than let the throw propagate to a template read.
- `IconPreviewTile` (`src/app/icon-preview-tile/`) renders one PNG via `URL.createObjectURL` +
  cleanup (`effect`'s `onCleanup`, to avoid leaking blob URLs across re-renders); the maskable
  safe-zone guide overlay is a CSS-only dashed circle **fixed at the spec's 66% diameter**,
  independent of whatever `maskablePadding` the user has dialed in — it's a reference guide to check
  padding against, not a visualization of the padding value itself.
- `icon-zip.ts` builds the BRIEF.md §5 ZIP layout via `jszip`. `core`'s Map keys are already
  namespaced under `public/`, matching the ZIP layout directly with **no remapping** — unlike
  `schematics`, which has to remap that generic prefix onto a real project's actual public dir. Since
  `ui` has no workspace `Tree`, `ngsw-config.json` becomes a standalone fragment
  (`ngsw-config-icons.json`, `{ assetGroups: [core.getNgswIconAssetGroup(...)] }`) for manual
  merging — this asymmetry with the schematic's safe in-place merge is expected, not a bug to fix
  here; steer users to the schematic path whenever a real workspace is available. `manifest.webmanifest`
  is a *full* file here (unlike the schematic, which only replaces the `icons` array in an existing
  one) since there's no pre-existing manifest to merge into — `ui` has to invent `name`/`short_name`/
  `display`/`scope`/`start_url` itself from the app-name field.
- TypeScript's typed-array lib (5.7+/6.x) makes plain `Uint8Array` generic over `ArrayBufferLike`
  (`ArrayBuffer | SharedArrayBuffer`), which doesn't satisfy DOM's `BlobPart`/`ArrayBufferView`
  constraint — `new Uint8Array(bytes)` (a cheap copy) resolves it; see `icon-preview-tile.ts`.
- Verified end-to-end with a real headless-Chromium run (Playwright) against `ng serve`, not just
  `ng build`/unit tests: WASM loads, all 11 tiles render actual images, the safe-zone toggle
  adds/removes the overlay, and the downloaded ZIP's contents (manifest/ngsw fragment/head snippet)
  reflect live-edited app-name/background values correctly.

## Constraints that shape implementation choices

- **Angular 17+ only** — the `public/` assets convention is hardcoded; there is no support for the
  older `src/assets/` layout.
- **SVG source only in v1** — no raster (PNG/JPG) input support.
- **No iOS splash-screen generation in v1** (flagged as a stretch goal, not to be scope-crept in).
- **Fully local/offline in both modes** — no SVG or project file is ever transmitted over the
  network. Keep this in mind before adding any dependency that phones home.
- **Rasterization must stay Puppeteer/Chromium-free** — `@resvg/resvg-wasm` was chosen specifically
  so `core` runs identically in Node and the browser without a headless-browser dependency.
