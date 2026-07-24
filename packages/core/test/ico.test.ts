import { describe, expect, it } from 'vitest';
import { encodeIco } from '../src/ico.js';

function fakePng(byte: number, length: number): Buffer {
  return Buffer.alloc(length, byte);
}

describe('encodeIco', () => {
  it('writes a well-formed ICO header and directory', () => {
    const images = [
      { size: 16, png: fakePng(0x11, 100) },
      { size: 32, png: fakePng(0x22, 200) },
      { size: 48, png: fakePng(0x33, 300) },
    ];
    const ico = encodeIco(images);

    expect(ico.readUInt16LE(0)).toBe(0); // reserved
    expect(ico.readUInt16LE(2)).toBe(1); // type: icon
    expect(ico.readUInt16LE(4)).toBe(3); // count

    const headerSize = 6;
    const entrySize = 16;

    let expectedOffset = headerSize + entrySize * images.length;
    images.forEach((image, i) => {
      const entryStart = headerSize + i * entrySize;
      expect(ico.readUInt8(entryStart)).toBe(image.size); // width
      expect(ico.readUInt8(entryStart + 1)).toBe(image.size); // height
      expect(ico.readUInt16LE(entryStart + 6)).toBe(32); // bpp
      expect(ico.readUInt32LE(entryStart + 8)).toBe(image.png.length);
      expect(ico.readUInt32LE(entryStart + 12)).toBe(expectedOffset);
      expectedOffset += image.png.length;
    });

    expect(ico.length).toBe(expectedOffset);
  });

  it('encodes a 256px dimension as 0 per the ICO spec', () => {
    const ico = encodeIco([{ size: 256, png: fakePng(0x44, 10) }]);
    expect(ico.readUInt8(6)).toBe(0); // width
    expect(ico.readUInt8(7)).toBe(0); // height
  });
});
