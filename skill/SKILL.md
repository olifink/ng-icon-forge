---
name: ng-icon-forge
description: Use when the user asks to generate, add, or update PWA icon assets (app icons, favicons, maskable icons, Apple touch icon) for an Angular project from a source SVG logo — e.g. "add PWA icons to this Angular app", "generate app icons from my logo.svg", "update the manifest icons", "the maskable icons look wrong". Only applies to Angular 17+ workspaces using the public/ assets convention.
---

# ng-icon-forge

Generates the full set of Angular PWA icon assets from a single source SVG and merges them
directly into the workspace: `public/icons/*.png` (8 sizes, `purpose: "any"`, plus 192/512
`maskable` variants), `public/favicon.ico`, `public/apple-touch-icon.png`,
`manifest.webmanifest`'s `icons` array, `ngsw-config.json`'s asset precaching, and the favicon/
apple-touch-icon/theme-color `<head>` tags in `index.html`.

It is invoked as a normal Angular CLI schematic via `ng add` — no MCP server, no separate CLI
binary, nothing to install beyond what `npx` fetches on demand. Run it with your existing shell
access exactly as you would any other `ng add`/`npx` command.

## When to use this

Reach for this whenever the user wants PWA/app icons generated or refreshed for an **Angular**
project from an **SVG** source (a logo, an icon-library glyph, etc.). Do not use it for:
- Non-Angular projects (no equivalent tool here — this is Angular-CLI-specific).
- Raster (PNG/JPG) source images — SVG input only.
- Projects on Angular < 17 or using the older `src/assets/` convention instead of `public/` — the
  schematic hardcodes the `public/` layout and will write to the wrong place otherwise.

## Prerequisites

The target project must already have PWA scaffolding in place — `manifest.webmanifest` and
`ngsw-config.json` present. This tool keeps an *existing* PWA setup's icons in sync; it doesn't
bootstrap one from scratch. If either file is missing, running the command below will fail with a
clear error telling you to run `ng add @angular/pwa` first — do that, then retry.

## Command

```
npx ng add ng-icon-forge --svg <path-to-source.svg> [options]
```

Options:
- `--svg <path>` (required) — path to the source SVG, resolved relative to the current working
  directory.
- `--project <name>` — which project to update, for multi-project workspaces. Angular CLI
  auto-fills this from the current directory when possible; only pass it explicitly if the
  workspace has more than one project and auto-detection doesn't pick the right one.
- `--maskable-padding <percent>` — safe-zone inset applied per side to the maskable icon variants.
  Default `20`. Increase it if the user reports their maskable icon's content looks clipped after
  installing on Android.
- `--bg <color>` — background color (any CSS color) used to flatten the Apple touch icon (iOS
  ignores alpha) and to fill the maskable icon canvas outside the safe zone. Default `#ffffff`.
- `--dry-run` — preview every file the command would create/modify without touching disk. This is
  a standard Angular CLI flag, not specific to this schematic — always available for free. Use it
  first when you're unsure, or when the user wants to review changes before they land.
- `--skip-install` — also a standard `ng add` flag; skips the `npm install` step `ng add` runs
  after installing the `ng-icon-forge` package itself.

## Example

```
npx ng add ng-icon-forge --svg ./src/assets/logo.svg --bg "#0f172a" --dry-run
```

Review the dry-run output, then rerun the same command without `--dry-run` to apply it.

## What it will NOT do

- Won't touch anything outside the icon/manifest/ngsw-config/index-head surface described above —
  routing, other `assetGroups` entries, and unrelated `<head>` tags are left untouched.
- Won't upload the SVG anywhere — this runs entirely locally via the installed npm package.
- Re-running it is safe and idempotent: it replaces its own previously-generated icons/tags rather
  than duplicating them, so it's fine to rerun after the user tweaks their logo or picks a
  different background color.
