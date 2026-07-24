# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

`packages/core` and `packages/schematics` are scaffolded and implemented (milestones 1–3 of
`BRIEF.md` §7). `packages/ui` and `skill/` do not exist yet. Treat `BRIEF.md` as the source of truth
for what's still to build, but don't assume every path it mentions already exists — check first.

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
runs `npm run build` first, which also copies `schema.json` into `dist/ng-add/` since `tsc` doesn't
copy non-TS assets. If you edit schema.json/collection.json and tests don't pick up the change,
check `dist/` was rebuilt.

To sanity-check the schematic against a real Angular workspace (beyond the fixture-tree unit
tests): scaffold a throwaway app with `npx @angular/cli new <name> --skip-install --skip-git`,
`npm install`, `npx ng add @angular/pwa` (so manifest/ngsw-config/service-worker exist), then run
`npx ng generate <path-to>/packages/schematics/collection.json:ng-add --svg <path-to-svg> --dry-run`
from inside it. `ng generate` accepts a direct filesystem path to a `collection.json` as the
collection specifier — no need to `npm link` or publish anything first.

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
`renderIconSet(svgBuffer, config) -> Map<relativePath, Buffer>` plus plain-data descriptions of the
manifest icons array and head-tag snippet. Both `schematics` (via `Tree` writes) and `ui` (via ZIP
writes) consume this same data — the icon-generation logic must never be duplicated between them,
only the write mechanism differs. `core` has no dependency on `@angular-devkit/*`, so it stays
usable standalone by the UI.

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

**`ui`** is Angular 22 with Material 3 expressive theming and Signals-based state, 100% client-side
(`@resvg/resvg-wasm` + `jszip` run in-browser). It always emits the `public/` convention and always
calls into `core` directly rather than reimplementing rendering. Because it has no workspace `Tree`
to operate on, its `ngsw-config.json` output is necessarily just an icon-only fragment
(`ngsw-config-icons.json`) for manual merging — this asymmetry with the schematic path (which does a
safe targeted merge) is expected, not a bug to fix in the UI; prefer the schematic path whenever a
real workspace is available. The UI is itself an installable PWA (own manifest + service worker).

## Constraints that shape implementation choices

- **Angular 17+ only** — the `public/` assets convention is hardcoded; there is no support for the
  older `src/assets/` layout.
- **SVG source only in v1** — no raster (PNG/JPG) input support.
- **No iOS splash-screen generation in v1** (flagged as a stretch goal, not to be scope-crept in).
- **Fully local/offline in both modes** — no SVG or project file is ever transmitted over the
  network. Keep this in mind before adding any dependency that phones home.
- **Rasterization must stay Puppeteer/Chromium-free** — `@resvg/resvg-wasm` was chosen specifically
  so `core` runs identically in Node and the browser without a headless-browser dependency.
