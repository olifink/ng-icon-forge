# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repository currently contains only `BRIEF.md` — no code has been written yet. There is no
`package.json`, no npm workspaces, and none of the packages described below exist on disk. Treat
`BRIEF.md` as the source of truth for what to build and read it in full before starting
implementation work; do not assume any file/directory mentioned there already exists without
checking.

Once the monorepo is scaffolded, update this file with real build/lint/test commands (they don't
exist yet, so none are listed here) and correct any architecture details below that changed during
implementation.

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
16/32/48) and `apple-touch-icon.png` (180×180, flattened onto a solid background since iOS ignores
alpha).

**`schematics`** is the actual published package. Its `ng-add` `Rule`:
1. Reads the source SVG from disk (outside the `Tree` — it's an external input) and calls
   `core.renderIconSet`.
2. Writes each generated icon under `public/icons/` via `tree.exists(path) ? tree.overwrite : tree.create`.
3. Merges `manifest.webmanifest`: full read/parse/replace-icons-array/overwrite. A full-file
   rewrite is intentional and considered safe here specifically because `Tree` writes are staged
   and reviewable via `--dry-run` — don't second-guess this into a partial-patch approach.
4. Merges `ngsw-config.json`: a **targeted** JSON edit of only the icon file list inside the
   relevant `assetGroups` entry — routing/caching rules must be left untouched. This is
   deliberately not a full-file rewrite (unlike the manifest step above).
5. Inserts/replaces favicon, apple-touch-icon, and theme-color `<head>` tags using Angular devkit's
   existing HTML-manipulation utilities (the same approach `@schematics/angular` uses internally for
   `index.html`) rather than hand-rolled string patching.
6. Returns the modified `Tree` — the Angular CLI itself handles dry-run diffing, confirmation, and
   commit; no bespoke preview/patch code belongs in this project.

Test schematics with `SchematicTestRunner` against a fixture workspace `Tree` (the standard Angular
schematics testing pattern), not by scaffolding a real `ng new` project for every unit test. Reserve
one real end-to-end run against a scaffolded project as an integration check.

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
