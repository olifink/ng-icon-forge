import { initWasm as resvgInitWasm, type InitInput } from '@resvg/resvg-wasm';

let initPromise: Promise<void> | undefined;

/**
 * Initializes the resvg WASM module. Must be called once, before `renderIconSet`, with
 * environment-appropriate wasm bytes — e.g. `fs.readFileSync(...)` in Node (schematics),
 * or a bundler asset fetch in the browser (ui). Core deliberately does not read the .wasm
 * file itself, so it stays I/O-free and works identically in both environments; loading
 * the bytes is left to each consumer.
 *
 * Idempotent: subsequent calls return the original init promise rather than re-initializing.
 */
export function initWasm(input: InitInput | Promise<InitInput>): Promise<void> {
  if (!initPromise) {
    initPromise = resvgInitWasm(input);
  }
  return initPromise;
}
