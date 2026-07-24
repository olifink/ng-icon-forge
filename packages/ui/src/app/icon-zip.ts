import { getHeadSnippet, getManifestColors, getManifestIcons, getNgswIconAssetGroup } from '@ng-icon-forge/core';
import JSZip from 'jszip';

export interface ZipExportOptions {
  appName: string;
  background: string;
  maskablePadding: number;
}

/**
 * Packages a rendered icon set into the ZIP layout from BRIEF.md §5. The schematic path
 * writes directly into a workspace `Tree` and can safely merge manifest.webmanifest/
 * ngsw-config.json in place; the ui has no workspace to operate on, so it hands back a full
 * manifest.webmanifest, an icon-only ngsw-config-icons.json *fragment* for manual merging, and
 * an index-head-snippet.html to paste in — all built from the same core data exports the
 * schematic uses, so "what goes where" isn't duplicated, only the packaging differs.
 */
export async function buildIconZip(icons: Map<string, Uint8Array>, options: ZipExportOptions): Promise<Blob> {
  const zip = new JSZip();

  for (const [path, bytes] of icons) {
    // core's Map keys are already namespaced under "public/" (e.g. "public/icons/icon-72x72.png"),
    // matching the ZIP layout directly — no remapping needed here (unlike the schematic, which
    // remaps that prefix onto a real project's public dir).
    zip.file(path, bytes);
  }

  const config = { background: options.background, maskablePadding: options.maskablePadding };
  const colors = getManifestColors(config);
  const manifest = {
    name: options.appName,
    short_name: options.appName,
    display: 'standalone',
    scope: './',
    start_url: './',
    icons: getManifestIcons(config),
    theme_color: colors.theme_color,
    background_color: colors.background_color,
  };
  zip.file('manifest.webmanifest', `${JSON.stringify(manifest, null, 2)}\n`);

  const iconWebPaths = [...icons.keys()].map((path) => `/${path.replace(/^public\//, '')}`);
  const ngswFragment = { assetGroups: [getNgswIconAssetGroup(iconWebPaths)] };
  zip.file('ngsw-config-icons.json', `${JSON.stringify(ngswFragment, null, 2)}\n`);

  zip.file('index-head-snippet.html', `${getHeadSnippet(config)}\n`);

  return zip.generateAsync({ type: 'blob' });
}
