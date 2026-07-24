import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { initWasm } from '../src/index.js';

const require = createRequire(import.meta.url);
const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');

await initWasm(readFileSync(wasmPath));
