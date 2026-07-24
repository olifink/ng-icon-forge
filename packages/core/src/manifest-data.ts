import { DEFAULT_CONFIG, ICON_SIZES, MASKABLE_SIZES } from './constants.js';
import type { IconForgeConfig, ManifestIcon } from './types.js';

/**
 * Plain-data description of the `icons` array to merge into manifest.webmanifest.
 * `src` values are web-root relative (no "public/" prefix), since manifest.webmanifest
 * is served from the app's web root — unlike `renderIconSet`'s Map keys, which are
 * workspace-relative for Tree/ZIP writes and therefore do carry a "public/" prefix.
 */
export function getManifestIcons(_config: Partial<IconForgeConfig> = {}): ManifestIcon[] {
  const icons: ManifestIcon[] = ICON_SIZES.map((size) => ({
    src: `icons/icon-${size}x${size}.png`,
    sizes: `${size}x${size}`,
    type: 'image/png',
    purpose: 'any' as const,
  }));

  for (const size of MASKABLE_SIZES) {
    icons.push({
      src: `icons/icon-maskable-${size}x${size}.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: 'maskable' as const,
    });
  }

  return icons;
}

/** theme_color/background_color fields relevant to manifest.webmanifest merges. */
export function getManifestColors(config: Partial<IconForgeConfig> = {}): { theme_color: string; background_color: string } {
  const resolved = { ...DEFAULT_CONFIG, ...config };
  return {
    theme_color: resolved.themeColor ?? resolved.background,
    background_color: resolved.background,
  };
}
