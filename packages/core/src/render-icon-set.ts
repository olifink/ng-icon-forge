import { Resvg } from '@resvg/resvg-wasm';
import { APPLE_TOUCH_ICON_SIZE, DEFAULT_CONFIG, FAVICON_SIZES, ICON_SIZES, MASKABLE_SIZES } from './constants.js';
import { encodeIco } from './ico.js';
import { wrapMaskable } from './svg-utils.js';
import type { IconForgeConfig } from './types.js';

function rasterize(svgString: string, size: number, background?: string): Buffer {
  const resvg = new Resvg(svgString, {
    fitTo: { mode: 'width', value: size },
    background,
  });
  return Buffer.from(resvg.render().asPng());
}

/**
 * Renders the full Angular PWA icon set from a single source SVG. Requires `initWasm` to
 * have already resolved (throws the underlying resvg error otherwise) — kept synchronous
 * to mirror the fact that rasterization itself needs no I/O once the WASM module is loaded.
 *
 * Returns a Map keyed by path relative to the workspace root (i.e. already namespaced
 * under "public/"), ready for either `Tree` writes (schematics) or ZIP entries (ui).
 */
export function renderIconSet(svg: string | Uint8Array, config: Partial<IconForgeConfig> = {}): Map<string, Buffer> {
  const resolvedConfig: IconForgeConfig = { ...DEFAULT_CONFIG, ...config };
  const svgString = typeof svg === 'string' ? svg : Buffer.from(svg).toString('utf-8');
  const output = new Map<string, Buffer>();

  for (const size of ICON_SIZES) {
    output.set(`public/icons/icon-${size}x${size}.png`, rasterize(svgString, size));
  }

  for (const size of MASKABLE_SIZES) {
    const wrapped = wrapMaskable(svgString, size, resolvedConfig.maskablePadding, resolvedConfig.background);
    output.set(`public/icons/icon-maskable-${size}x${size}.png`, rasterize(wrapped, size));
  }

  output.set('public/apple-touch-icon.png', rasterize(svgString, APPLE_TOUCH_ICON_SIZE, resolvedConfig.background));

  const favicons = FAVICON_SIZES.map((size) => ({ size, png: rasterize(svgString, size) }));
  output.set('public/favicon.ico', encodeIco(favicons));

  return output;
}
