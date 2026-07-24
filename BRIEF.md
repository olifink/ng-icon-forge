# BRIEF: `ng-icon-forge` — SVG → Angular PWA Icon Asset Generator

## 1. Problem

Angular PWA projects need a full set of manifest icons (any + maskable, multiple
sizes), favicons, and Apple touch icons generated from a single source SVG, then
merged into the exact locations Angular's CLI and service worker config expect
(`public/icons/`, `manifest.webmanifest`, `ngsw-config.json`, `index.html` head
tags). No existing tool is Angular-convention-aware, and none exposes the
capability to a coding agent as naturally as to a human.

## 2. Goals

- One SVG in → every icon asset generated and correctly merged into an
  existing Angular workspace, via a single command: `ng add ng-icon-forge`.
- Same rendering logic usable two ways:
  1. **`ng-add` schematic** (primary mechanism) — installs `ng-icon-forge`
     and runs its schematic against the current workspace, writing icon
     files and merging `manifest.webmanifest` / `ngsw-config.json` directly
     via the Angular CLI's `Tree` API. Supports `ng add ng-icon-forge --dry-run`
     out of the box (no custom preview tooling needed — the CLI provides it).
  2. **Angular UI** — drag-drop SVG, live preview (incl. maskable safe-zone
     overlay), config controls, download ZIP. For visual preview, for
     non-CLI users, or for generating assets outside an Angular workspace
     entirely. Installable PWA itself.
- A coding agent (e.g. Claude Code) uses the tool by running
  `npx ng add ng-icon-forge --svg ./logo.svg` via its normal shell access —
  no bespoke MCP server required. A thin Claude Skill documents this so the
  agent reaches for it reliably.
- Fully local/offline. No SVG ever leaves the user's machine in any mode.

## 3. Non-goals

- No splash-screen generation for iOS (out of scope v1 — flag as a stretch goal).
- No remote/hosted MCP endpoint, and no dedicated MCP server package — `ng add`
  run via bash is the agent-facing interface (see §4).
- No raster (PNG/JPG) source support in v1 — SVG in only.
- No support for Angular versions before 17, and no `src/assets/` convention
  support — `public/` is assumed throughout.

## 4. Architecture

Monorepo, npm workspaces:

```
ng-icon-forge/
  packages/
    core/               # pure TS: SVG rasterization, no I/O, no Tree/Angular knowledge
    schematics/          # the published npm package — ng-add entry point
      src/
        ng-add/
          index.ts        # Rule factory: the actual logic
          schema.json      # CLI option definitions (--svg, --maskable-padding, --bg, --dry-run is free via ng CLI)
          schema.d.ts
        utils/
          manifest.ts      # read/parse/merge manifest.webmanifest via Tree
          ngsw-config.ts   # read/parse/merge ngsw-config.json asset group via Tree
          index-html.ts    # insert/replace <head> tags via Tree
      collection.json
      package.json         # "schematics": "./collection.json", "ng-add": { "save": false }
    ui/                  # Angular 22 + Material 3 expressive app
  skill/
    SKILL.md              # documents the ng add command; no wrapper script needed
```

### `core`
- Rasterization via `@resvg/resvg-wasm` (works identically in browser and
  Node — avoids Puppeteer/Chromium dependency entirely, keeps everything
  local and lightweight).
- Pure function: `renderIconSet(svgBuffer, config) -> Map<relativePath, Buffer>`.
- Icon sizes: 72, 96, 128, 144, 152, 192, 384, 512 (`purpose: "any"`), plus
  192/512 maskable variants rendered with configurable safe-zone padding
  (default 20%, per Android adaptive-icon spec — content must stay in the
  inner ~66% to survive circle/squircle masking).
- `favicon.ico` (multi-res 16/32/48) and `apple-touch-icon.png` (180×180,
  flattened onto a solid/configurable background since iOS ignores alpha).
- Also exports the manifest icons array and the head-tag snippet as plain
  data structures — consumed by both the schematic (Tree writes) and the UI
  (ZIP writes), so the "what goes where" knowledge lives in one place even
  though *how* it's written differs by consumer.
- No dependency on `@angular-devkit/*` — stays usable standalone by the UI.

### `schematics` (the npm package, published as `ng-icon-forge`)
- `ng add ng-icon-forge --svg ./logo.svg [--maskable-padding 20] [--bg "#ffffff"] [--dry-run] [--skip-install]`
- The `ng-add` `Rule`:
  1. Reads the SVG from disk (outside the Tree — it's an external input, not
     a workspace file) and calls `core.renderIconSet`.
  2. For each generated icon file: `tree.exists(path) ? tree.overwrite(path, buf) : tree.create(path, buf)`
     under `public/icons/`.
  3. Reads `manifest.webmanifest` via `tree.read()`, `JSON.parse`s it,
     replaces/inserts the `icons` array, `tree.overwrite()`s the result —
     the *whole file*, since Tree writes are staged and reviewable via
     `--dry-run` before anything touches disk, so a full-file rewrite here
     is safe rather than risky.
  4. Reads `ngsw-config.json` via `tree.read()`, `JSON.parse`s it, updates
     only the icon file list inside the relevant `assetGroups` entry
     (leaving routing/caching rules untouched), `tree.overwrite()`s the
     result. Still a targeted edit — just done via JSON manipulation on the
     Tree instead of a hand-rolled text patch.
  5. Uses Angular devkit's existing HTML-manipulation utilities (the same
     approach `@schematics/angular` uses internally for `index.html`) to
     insert/replace favicon, apple-touch-icon, and theme-color `<head>` tags.
  6. Returns the modified `Tree`. The CLI itself handles the dry-run diff,
     confirmation, and commit — no bespoke preview/patch code needed
     anywhere in this project.
- Tested with `SchematicTestRunner` against a fixture workspace tree (the
  standard Angular schematics testing pattern) rather than a real `ng new`
  project for unit tests; one real end-to-end run against a scaffolded
  project as an integration check.
- Published to npm as `ng-icon-forge`; `ng add ng-icon-forge` is the entire
  distribution and invocation story — no separate CLI binary, no MCP server.

### `skill/`
- `SKILL.md` describing when to trigger (any request to generate/update PWA
  icons for an Angular project from an SVG) and documenting the single
  command: `npx ng add ng-icon-forge --svg <path> [--dry-run]`. Since this
  is a normal CLI invocation, a coding agent's existing bash access is
  sufficient — no MCP wrapper to build or maintain.

### `ui`
- Angular 22, Material 3 expressive theming, Signals-based state.
- Drag-drop SVG input, live canvas preview per size, maskable safe-zone
  overlay toggle, background/padding controls. Always emits `public/`
  convention.
- 100% client-side: `@resvg/resvg-wasm` + `jszip` run in-browser, nothing
  uploaded. Uses `core` directly for rendering, then zips the output for
  people who aren't running the schematic against a live workspace (e.g.
  previewing before committing, or generating assets for a non-Angular use).
- Installable PWA (own manifest + service worker) so it works offline once
  visited once.

## 5. ZIP layout (UI path only — schematic path writes directly, no ZIP)

```
public/icons/icon-72x72.png
...
public/icons/icon-512x512.png
public/icons/icon-maskable-192x192.png
public/icons/icon-maskable-512x512.png
public/favicon.ico
public/apple-touch-icon.png
manifest.webmanifest          # full file
ngsw-config-icons.json        # icon-only fragment, for manual merge (no Tree available here)
index-head-snippet.html       # <head> tags to paste in
```

Note the asymmetry: the schematic path merges `ngsw-config.json` safely via
the Tree/JSON approach in §4; the UI has no workspace to operate on, so it
can only hand back a fragment for the user to merge by hand. This is the
expected reason to prefer the schematic path whenever there's a real
workspace available.

## 6. Hosting

- `ui` → GitHub Pages (static, client-side only — no server needed).
- `schematics` package → npm registry. Installed and run locally via
  `ng add` / `npx` — not hosted, no server, keeps SVGs and project files off
  any network.

## 7. Milestones

1. `core`: rasterization + icon-set/manifest-data generation, unit-tested
   against a fixture SVG.
2. `schematics`: `ng-add` `Rule` — icon file writes, manifest merge, tested
   with `SchematicTestRunner` against a fixture Tree.
3. `schematics`: `ngsw-config.json` targeted merge + `index.html` head-tag
   insertion.
4. `schematics`: end-to-end check against a real scaffolded `ng new`
   project; publish `ng-icon-forge` to npm; write `skill/SKILL.md`.
5. `ui`: functional drag-drop → preview → download, plain Material theming.
6. `ui`: Material 3 expressive pass, maskable safe-zone overlay, PWA-ify,
   deploy to GitHub Pages.

## 8. Resolved decisions

- **Primary interface:** `ng add ng-icon-forge`, not a standalone CLI or MCP
  server. Coding agents use it via normal bash access; `--dry-run` is
  provided free by the Angular CLI, so no custom diff/preview mechanism is
  needed.
- **Angular version support:** 17+ only (`public/` convention hardcoded).
- **`manifest.webmanifest` (schematic path):** full-file overwrite via Tree —
  safe because Tree writes are staged and dry-run-reviewable.
- **`ngsw-config.json` (schematic path):** targeted JSON edit of the icon
  file list only, via Tree — routing/caching rules untouched.
- **`ngsw-config.json` (UI/ZIP path):** stays a fragment for manual merge —
  there's no workspace Tree to safely operate on outside the schematic.
