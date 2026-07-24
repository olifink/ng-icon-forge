import { describe, expect, it } from 'vitest';
import { encodeIco } from '../src/ico.js';

function fakePng(byte: number, length: number): Uint8Array {
  return new Uint8Array(length).fill(byte);
}

describe('encodeIco', () => {
  it('writes a well-formed ICO header and directory', () => {
    const images = [
      { size: 16, png: fakePng(0x11, 100) },
      { size: 32, png: fakePng(0x22, 200) },
      { size: 48, png: fakePng(0x33, 300) },
    ];
    const ico = encodeIco(images);
    const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength);

    expect(view.getUint16(0, true)).toBe(0); // reserved
    expect(view.getUint16(2, true)).toBe(1); // type: icon
    expect(view.getUint16(4, true)).toBe(3); // count

    const headerSize = 6;
    const entrySize = 16;

    let expectedOffset = headerSize + entrySize * images.length;
    images.forEach((image, i) => {
      const entryStart = headerSize + i * entrySize;
      expect(view.getUint8(entryStart)).toBe(image.size); // width
      expect(view.getUint8(entryStart + 1)).toBe(image.size); // height
      expect(view.getUint16(entryStart + 6, true)).toBe(32); // bpp
      expect(view.getUint32(entryStart + 8, true)).toBe(image.png.length);
      expect(view.getUint32(entryStart + 12, true)).toBe(expectedOffset);
      expectedOffset += image.png.length;
    });

    expect(ico.length).toBe(expectedOffset);
  });

  it('encodes a 256px dimension as 0 per the ICO spec', () => {
    const ico = encodeIco([{ size: 256, png: fakePng(0x44, 10) }]);
    const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength);
    expect(view.getUint8(6)).toBe(0); // width
    expect(view.getUint8(7)).toBe(0); // height
  });
});
