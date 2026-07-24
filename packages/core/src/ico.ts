export interface IcoImage {
  size: number;
  png: Uint8Array;
}

const ICO_HEADER_SIZE = 6;
const ICO_DIR_ENTRY_SIZE = 16;

/**
 * Packs PNG-encoded images into a multi-resolution .ico container. Modern Windows,
 * browsers, and OSes all accept PNG-format image data inside ICO directory entries
 * (no BMP/DIB re-encoding needed), which keeps this dependency-free.
 *
 * Built on plain Uint8Array/DataView rather than Node's Buffer, since core has no Node
 * dependency and needs to run identically in the browser (see wasm.ts) — a Buffer here
 * would require a polyfill for the ui package.
 */
export function encodeIco(images: IcoImage[]): Uint8Array {
  let offset = ICO_HEADER_SIZE + ICO_DIR_ENTRY_SIZE * images.length;
  const totalSize = offset + images.reduce((sum, image) => sum + image.png.length, 0);

  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);

  view.setUint16(0, 0, true); // reserved, must be 0
  view.setUint16(2, 1, true); // image type: 1 = icon
  view.setUint16(4, images.length, true);

  for (const [index, { size, png }] of images.entries()) {
    const entryOffset = ICO_HEADER_SIZE + index * ICO_DIR_ENTRY_SIZE;
    const dim = size >= 256 ? 0 : size; // 0 encodes 256px per the ICO spec
    view.setUint8(entryOffset, dim); // width
    view.setUint8(entryOffset + 1, dim); // height
    view.setUint8(entryOffset + 2, 0); // color palette count (0 = no palette)
    view.setUint8(entryOffset + 3, 0); // reserved
    view.setUint16(entryOffset + 4, 1, true); // color planes
    view.setUint16(entryOffset + 6, 32, true); // bits per pixel
    view.setUint32(entryOffset + 8, png.length, true); // image data size
    view.setUint32(entryOffset + 12, offset, true); // offset of image data from file start

    out.set(png, offset);
    offset += png.length;
  }

  return out;
}
