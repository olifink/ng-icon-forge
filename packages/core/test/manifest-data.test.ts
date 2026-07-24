import { describe, expect, it } from 'vitest';
import { ICON_SIZES, MASKABLE_SIZES } from '../src/constants.js';
import { getManifestColors, getManifestIcons } from '../src/manifest-data.js';

describe('getManifestIcons', () => {
  it('lists every "any" size with web-root-relative src (no public/ prefix)', () => {
    const icons = getManifestIcons();

    for (const size of ICON_SIZES) {
      const icon = icons.find((i) => i.sizes === `${size}x${size}` && i.purpose === 'any');
      expect(icon).toBeDefined();
      expect(icon!.src).toBe(`icons/icon-${size}x${size}.png`);
      expect(icon!.src.startsWith('public/')).toBe(false);
      expect(icon!.type).toBe('image/png');
    }
  });

  it('lists maskable variants separately from "any"', () => {
    const icons = getManifestIcons();
    const maskable = icons.filter((i) => i.purpose === 'maskable');

    expect(maskable).toHaveLength(MASKABLE_SIZES.length);
    for (const size of MASKABLE_SIZES) {
      expect(maskable.some((i) => i.src === `icons/icon-maskable-${size}x${size}.png`)).toBe(true);
    }
  });

  it('total icon count matches ICON_SIZES + MASKABLE_SIZES', () => {
    expect(getManifestIcons()).toHaveLength(ICON_SIZES.length + MASKABLE_SIZES.length);
  });
});

describe('getManifestColors', () => {
  it('falls back theme_color to background when themeColor is not set', () => {
    expect(getManifestColors({ background: '#123456' })).toEqual({
      theme_color: '#123456',
      background_color: '#123456',
    });
  });

  it('uses an explicit themeColor when provided', () => {
    expect(getManifestColors({ background: '#123456', themeColor: '#abcdef' })).toEqual({
      theme_color: '#abcdef',
      background_color: '#123456',
    });
  });
});
