export interface IcoImage {
  size: number;
  png: Buffer;
}

const ICO_HEADER_SIZE = 6;
const ICO_DIR_ENTRY_SIZE = 16;

/**
 * Packs PNG-encoded images into a multi-resolution .ico container. Modern Windows,
 * browsers, and OSes all accept PNG-format image data inside ICO directory entries
 * (no BMP/DIB re-encoding needed), which keeps this dependency-free.
 */
export function encodeIco(images: IcoImage[]): Buffer {
  let offset = ICO_HEADER_SIZE + ICO_DIR_ENTRY_SIZE * images.length;

  const header = Buffer.alloc(ICO_HEADER_SIZE);
  header.writeUInt16LE(0, 0); // reserved, must be 0
  header.writeUInt16LE(1, 2); // image type: 1 = icon
  header.writeUInt16LE(images.length, 4);

  const dirEntries: Buffer[] = [];
  for (const { size, png } of images) {
    const entry = Buffer.alloc(ICO_DIR_ENTRY_SIZE);
    const dim = size >= 256 ? 0 : size; // 0 encodes 256px per the ICO spec
    entry.writeUInt8(dim, 0); // width
    entry.writeUInt8(dim, 1); // height
    entry.writeUInt8(0, 2); // color palette count (0 = no palette)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8); // image data size
    entry.writeUInt32LE(offset, 12); // offset of image data from file start
    dirEntries.push(entry);
    offset += png.length;
  }

  return Buffer.concat([header, ...dirEntries, ...images.map((image) => image.png)]);
}
