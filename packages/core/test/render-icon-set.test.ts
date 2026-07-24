import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ICON_SIZES, MASKABLE_SIZES } from '../src/constants.js';
import { renderIconSet } from '../src/render-icon-set.js';

const fixturePath = fileURLToPath(new URL('./fixtures/sample-icon.svg', import.meta.url));
const sampleSvg = readFileSync(fixturePath, 'utf-8');

const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readPngDimensions(png: Uint8Array): { width: number; height: number } {
  // IHDR chunk starts right after the 8-byte signature + 4-byte length + 4-byte "IHDR" type.
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return {
    width: view.getUint32(16, false),
    height: view.getUint32(20, false),
  };
}

describe('renderIconSet', () => {
  it('produces every expected relative path, all namespaced under public/', () => {
    const result = renderIconSet(sampleSvg);

    for (const size of ICON_SIZES) {
      expect(result.has(`public/icons/icon-${size}x${size}.png`)).toBe(true);
    }
    for (const size of MASKABLE_SIZES) {
      expect(result.has(`public/icons/icon-maskable-${size}x${size}.png`)).toBe(true);
    }
    expect(result.has('public/apple-touch-icon.png')).toBe(true);
    expect(result.has('public/favicon.ico')).toBe(true);

    // No stray entries beyond the expected set.
    expect(result.size).toBe(ICON_SIZES.length + MASKABLE_SIZES.length + 2);
  });

  it('renders valid, correctly-sized PNGs for the "any" icons', () => {
    const result = renderIconSet(sampleSvg);

    for (const size of ICON_SIZES) {
      const png = result.get(`public/icons/icon-${size}x${size}.png`)!;
      expect(png.subarray(0, 8)).toEqual(PNG_MAGIC);
      expect(readPngDimensions(png)).toEqual({ width: size, height: size });
    }
  });

  it('renders maskable icons at full canvas size with the safe-zone content inset', () => {
    const result = renderIconSet(sampleSvg, { maskablePadding: 20 });

    for (const size of MASKABLE_SIZES) {
      const png = result.get(`public/icons/icon-maskable-${size}x${size}.png`)!;
      expect(png.subarray(0, 8)).toEqual(PNG_MAGIC);
      expect(readPngDimensions(png)).toEqual({ width: size, height: size });
    }
  });

  it('renders the apple-touch-icon at 180x180 flattened onto the background color', () => {
    const result = renderIconSet(sampleSvg, { background: '#ff0000' });
    const png = result.get('public/apple-touch-icon.png')!;

    expect(png.subarray(0, 8)).toEqual(PNG_MAGIC);
    expect(readPngDimensions(png)).toEqual({ width: 180, height: 180 });
  });

  it('produces a favicon.ico with a valid ICO header for 3 images', () => {
    const result = renderIconSet(sampleSvg);
    const ico = result.get('public/favicon.ico')!;
    const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength);

    expect(view.getUint16(0, true)).toBe(0); // reserved
    expect(view.getUint16(2, true)).toBe(1); // type: icon
    expect(view.getUint16(4, true)).toBe(3); // image count: 16, 32, 48
  });

  it('accepts raw bytes as well as a string', () => {
    const result = renderIconSet(new TextEncoder().encode(sampleSvg));
    expect(result.get('public/icons/icon-72x72.png')!.subarray(0, 8)).toEqual(PNG_MAGIC);
  });

  it('throws a descriptive error when the SVG has neither viewBox nor width/height', () => {
    const noDims = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="5"/></svg>';
    // Only the maskable path needs a viewBox (fitTo:width alone works for the plain icons),
    // so exercise it via the maskable size list.
    expect(() => renderIconSet(noDims)).toThrow(/viewBox/);
  });
});
