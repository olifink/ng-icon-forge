# ng-icon-forge

[![npm version](https://img.shields.io/npm/v/ng-icon-forge.svg)](https://www.npmjs.com/package/ng-icon-forge)

Generate a full Angular PWA icon set from a single SVG and merge it directly into your workspace
via `ng add`.

```
npx ng add ng-icon-forge --svg ./logo.svg
```

Requires an existing PWA setup — `manifest.webmanifest` and `ngsw-config.json` already present
(run `ng add @angular/pwa` first if you don't have one yet). Assumes Angular 17+'s `public/`
assets convention.

## What it generates

- `public/icons/icon-{72,96,128,144,152,192,384,512}x*.png` (`purpose: "any"`)
- `public/icons/icon-maskable-{192,512}x*.png` (`purpose: "maskable"`)
- `public/favicon.ico` (multi-res 16/32/48)
- `public/apple-touch-icon.png` (180×180)
- Updates to `manifest.webmanifest`'s `icons` array, a dedicated precaching entry in
  `ngsw-config.json`, and the favicon/apple-touch-icon/theme-color `<head>` tags in `index.html`

## Options

| Option | Default | Description |
|---|---|---|
| `--svg <path>` | *(required)* | Path to the source SVG |
| `--project <name>` | auto-detected | Which project to update, in multi-project workspaces |
| `--maskable-padding <percent>` | `20` | Safe-zone inset per side on the maskable icon variants |
| `--bg <color>` | `#ffffff` | Background used to flatten the Apple touch icon and fill the maskable canvas |
| `--dry-run` | — | Preview every change without writing anything |
| `--skip-install` | — | Skip the post-install `npm install` |

Fully local — the SVG never leaves your machine. Re-running the command is safe and idempotent.

Full project, including a drag-drop web app and a Claude Skill for coding agents:
**https://github.com/olifink/ng-icon-forge**
