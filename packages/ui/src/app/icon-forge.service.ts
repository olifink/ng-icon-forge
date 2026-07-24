import { Injectable, signal } from '@angular/core';
import { initWasm, renderIconSet, type IconForgeConfig } from '@ng-icon-forge/core';

/**
 * Thin wrapper around `core`: owns the one-time WASM init (core itself is deliberately
 * I/O-free, so *how* the wasm bytes are obtained is left to each consumer — see
 * packages/core/src/wasm.ts) and exposes it as a signal the rest of the app can react to.
 *
 * `index_bg.wasm` is copied into the build output by an extra `assets` glob in angular.json
 * (straight from @resvg/resvg-wasm's own package contents), so it's fetchable as a same-origin
 * relative URL alongside the app's own static files.
 */
@Injectable({ providedIn: 'root' })
export class IconForgeService {
  readonly wasmReady = signal(false);
  readonly wasmError = signal<string | null>(null);

  constructor() {
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await initWasm('index_bg.wasm');
      this.wasmReady.set(true);
    } catch (error) {
      this.wasmError.set(error instanceof Error ? error.message : String(error));
    }
  }

  render(svgText: string, config: Partial<IconForgeConfig>): Map<string, Uint8Array> {
    return renderIconSet(svgText, config);
  }
}
