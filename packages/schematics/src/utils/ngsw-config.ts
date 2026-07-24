import { SchematicsException, type Tree } from '@angular-devkit/schematics';
import { NGSW_ICON_ASSET_GROUP_NAME, getNgswIconAssetGroup, type NgswAssetGroup } from '@ng-icon-forge/core';

interface NgswConfig {
  assetGroups?: NgswAssetGroup[];
  [key: string]: unknown;
}

/**
 * Merges the generated icon paths into ngsw-config.json as a single, dedicated assetGroup —
 * rather than editing whichever pre-existing group looks "relevant" — so routing/caching rules
 * for every other group are provably untouched. Safe against `ngsw-config`'s actual resource-
 * ownership semantics: a resource path may appear in multiple assetGroups' patterns without
 * erroring, ownership just goes to whichever group is first in array order (see
 * @angular/service-worker's config generator), which is why the group is unshifted to the
 * front — so it deterministically claims these paths even if another group's glob also matches.
 *
 * The group's shape comes from `core.getNgswIconAssetGroup` — the same helper the ui package's
 * ZIP export uses for its standalone ngsw-config-icons.json fragment, so both consumers agree.
 */
export function mergeNgswConfigIcons(tree: Tree, ngswConfigPath: string, iconWebPaths: string[]): void {
  if (!tree.exists(ngswConfigPath)) {
    throw new SchematicsException(
      `Could not find "${ngswConfigPath}". ng-icon-forge expects an existing service worker config to merge ` +
        'icon precaching into — run "ng add @angular/pwa" first, or create ngsw-config.json manually.',
    );
  }

  let config: NgswConfig;
  try {
    config = JSON.parse(tree.readText(ngswConfigPath));
  } catch (error) {
    throw new SchematicsException(`Could not parse "${ngswConfigPath}" as JSON: ${(error as Error).message}`);
  }

  if (!Array.isArray(config.assetGroups)) {
    throw new SchematicsException(`"${ngswConfigPath}" has no "assetGroups" array to merge icon entries into.`);
  }

  const managedGroup = getNgswIconAssetGroup(iconWebPaths);
  const existingIndex = config.assetGroups.findIndex((group) => group.name === NGSW_ICON_ASSET_GROUP_NAME);
  if (existingIndex === -1) {
    config.assetGroups.unshift(managedGroup);
  } else {
    config.assetGroups[existingIndex] = managedGroup;
  }

  tree.overwrite(ngswConfigPath, `${JSON.stringify(config, null, 2)}\n`);
}
