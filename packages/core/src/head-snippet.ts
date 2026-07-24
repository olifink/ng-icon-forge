import { DEFAULT_CONFIG } from './constants.js';
import type { IconForgeConfig } from './types.js';

/**
 * Plain-data `<head>` tag snippet (favicon, apple-touch-icon, theme-color) — consumed by
 * the schematic (inserted via devkit's HTML utilities) and handed back verbatim to the UI
 * for the ZIP path's index-head-snippet.html.
 */
export function getHeadSnippet(config: Partial<IconForgeConfig> = {}): string {
  const resolved = { ...DEFAULT_CONFIG, ...config };
  const themeColor = resolved.themeColor ?? resolved.background;

  return [
    '<link rel="icon" href="favicon.ico" sizes="any">',
    '<link rel="apple-touch-icon" href="apple-touch-icon.png">',
    `<meta name="theme-color" content="${themeColor}">`,
  ].join('\n');
}
