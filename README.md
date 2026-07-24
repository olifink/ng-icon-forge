# ng-icon-forge

[![npm version](https://img.shields.io/npm/v/ng-icon-forge.svg)](https://www.npmjs.com/package/ng-icon-forge)
[![Deploy ui to GitHub Pages](https://github.com/olifink/ng-icon-forge/actions/workflows/deploy-ui.yml/badge.svg)](https://github.com/olifink/ng-icon-forge/actions/workflows/deploy-ui.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Generate a full Angular PWA icon set — `any` + `maskable` manifest icons, favicon, Apple touch
icon — from a single source SVG, and merge it straight into an existing Angular workspace's
`public/icons/`, `manifest.webmanifest`, `ngsw-config.json`, and `index.html`.

Live demo: **https://olifink.github.io/ng-icon-forge/**

## Three ways to use it

| | For | |
|---|---|---|
| **`ng add` schematic** | Real Angular 17+ workspaces — the primary interface | `npx ng add ng-icon-forge --svg ./logo.svg` |
| **Web app** | Previewing before committing, or generating assets outside an Angular workspace | https://olifink.github.io/ng-icon-forge/ |
| **Claude Skill** | Coding agents that should reach for this tool automatically | [`skill/SKILL.md`](skill/SKILL.md) |

Fully local/offline in every mode — no SVG or project file ever leaves your machine.

## `ng add` schematic

```
npx ng add ng-icon-forge --svg ./logo.svg
```

Requires an existing PWA setup — `manifest.webmanifest` and `ngsw-config.json` already present
(run `ng add @angular/pwa` first if you don't have one yet). Assumes Angular 17+'s `public/`
assets convention; there's no support for the older `src/assets/` layout.

| Option | Default | Description |
|---|---|---|
| `--svg <path>` | *(required)* | Path to the source SVG |
| `--project <name>` | auto-detected | Which project to update, in multi-project workspaces |
| `--maskable-padding <percent>` | `20` | Safe-zone inset per side on the maskable icon variants |
| `--bg <color>` | `#ffffff` | Background used to flatten the Apple touch icon and fill the maskable canvas |
| `--dry-run` | — | Preview every change without writing anything (free from the Angular CLI) |
| `--skip-install` | — | Skip the post-install `npm install` (free from the Angular CLI) |

Re-running the command is safe and idempotent — it replaces its own previously-generated
icons/tags rather than duplicating them, so it's fine to rerun after tweaking the logo or the
background color.

### What it generates

- `public/icons/icon-{72,96,128,144,152,192,384,512}x*.png` — `purpose: "any"`
- `public/icons/icon-maskable-{192,512}x*.png` — `purpose: "maskable"`
- `public/favicon.ico` — multi-res 16/32/48
- `public/apple-touch-icon.png` — 180×180, flattened onto `--bg`
- `manifest.webmanifest`'s `icons` array, plus `theme_color`/`background_color`
- A dedicated `ngsw-config.json` asset group precaching all of the above (existing groups are
  left untouched)
- Favicon / apple-touch-icon / theme-color `<head>` tags in `index.html`

## Web app

For previewing icons before committing to a workspace, or generating assets for a non-Angular
project: **https://olifink.github.io/ng-icon-forge/**

Drag and drop an SVG, adjust the background color and maskable padding, toggle the maskable
safe-zone guide, and download a ZIP with the same assets as the schematic — plus a full
`manifest.webmanifest`, an `ngsw-config-icons.json` fragment to merge by hand (there's no
workspace `Tree` to merge into automatically outside the schematic), and an
`index-head-snippet.html` to paste in. Runs entirely client-side — SVG rasterization happens via
WASM in the browser, nothing is ever uploaded.

## Claude Skill

[`skill/SKILL.md`](skill/SKILL.md) documents the schematic invocation for coding agents. Copy it
into a project's `.claude/skills/ng-icon-forge/SKILL.md` (or wherever your agent looks for
skills) so it reaches for `ng add ng-icon-forge` reliably whenever asked to generate or update
PWA icons for an Angular app.

## Monorepo layout

```
packages/
  core/         pure TS: SVG rasterization (@resvg/resvg-wasm), no Node/Angular dependency
  schematics/   the published npm package "ng-icon-forge" — the ng-add schematic
  ui/           the web app above (Angular 22 + Material 3, installable PWA)
skill/
  SKILL.md
```

`core` is the single source of truth for icon sizes, manifest data, and the ngsw asset-group
shape — `schematics` (via `Tree` writes) and `ui` (via a ZIP) both consume the same data, only
the write mechanism differs. See [`CLAUDE.md`](CLAUDE.md) for the full architecture writeup and
[`BRIEF.md`](BRIEF.md) for the original design brief.

## Development

```
npm install
npm run build       # tsc build for every package
npm run typecheck    # tsc --noEmit for every package
npm run test           # vitest run for every package
```

Per-package details — running a single test file, `ng serve` for the web app, checking the
schematic against a real scaffolded project, etc. — are in [`CLAUDE.md`](CLAUDE.md).

## License

MIT © Oliver Fink — see [LICENSE](LICENSE).
