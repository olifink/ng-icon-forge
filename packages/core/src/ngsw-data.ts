export const NGSW_ICON_ASSET_GROUP_NAME = 'ng-icon-forge-icons';

export interface NgswAssetGroup {
  name: string;
  installMode: 'prefetch' | 'lazy';
  updateMode?: 'prefetch' | 'lazy';
  resources: { files: string[] };
}

/**
 * The ngsw-config.json `assetGroups` entry that precaches ng-icon-forge's generated icons —
 * shared shape for both the schematic (which merges this into an existing config's array) and
 * the ui's ZIP export (which hands back a standalone fragment for manual merging, since it has
 * no workspace Tree to merge into directly).
 */
export function getNgswIconAssetGroup(iconWebPaths: string[]): NgswAssetGroup {
  return {
    name: NGSW_ICON_ASSET_GROUP_NAME,
    installMode: 'lazy',
    updateMode: 'prefetch',
    resources: { files: [...iconWebPaths].sort() },
  };
}
