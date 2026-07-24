import type { IconForgeConfig } from './types.js';

/** `purpose: "any"` manifest icon sizes. */
export const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512] as const;

/** `purpose: "maskable"` manifest icon sizes (Android adaptive-icon compatible). */
export const MASKABLE_SIZES = [192, 512] as const;

/** Sizes packed into the multi-res favicon.ico. */
export const FAVICON_SIZES = [16, 32, 48] as const;

/** iOS home-screen icon size; flattened onto a solid background since iOS ignores alpha. */
export const APPLE_TOUCH_ICON_SIZE = 180;

export const DEFAULT_CONFIG: IconForgeConfig = {
  maskablePadding: 20,
  background: '#ffffff',
};
