import { SchematicsException, type Tree } from '@angular-devkit/schematics';
import type { ManifestIcon } from '@ng-icon-forge/core';

export interface ManifestIconsUpdate {
  icons: ManifestIcon[];
  themeColor: string;
  backgroundColor: string;
}

/**
 * Merges the generated icon set into an existing manifest.webmanifest: the `icons` array is
 * replaced wholesale (safe here because Tree writes are staged and reviewable via --dry-run
 * before anything touches disk — see BRIEF.md §4), while every other field is left as-is.
 *
 * Assumes manifest.webmanifest already exists (from `ng add @angular/pwa` or a manual PWA
 * setup) — ng-icon-forge keeps icons in sync with an existing PWA config, it doesn't bootstrap
 * one from scratch.
 */
export function mergeManifestIcons(tree: Tree, manifestPath: string, update: ManifestIconsUpdate): void {
  if (!tree.exists(manifestPath)) {
    throw new SchematicsException(
      `Could not find "${manifestPath}". ng-icon-forge expects an existing PWA manifest to merge ` +
        'icons into — run "ng add @angular/pwa" first, or create manifest.webmanifest manually.',
    );
  }

  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(tree.readText(manifestPath));
  } catch (error) {
    throw new SchematicsException(`Could not parse "${manifestPath}" as JSON: ${(error as Error).message}`);
  }

  manifest['icons'] = update.icons;
  manifest['theme_color'] = update.themeColor;
  manifest['background_color'] = update.backgroundColor;

  tree.overwrite(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
