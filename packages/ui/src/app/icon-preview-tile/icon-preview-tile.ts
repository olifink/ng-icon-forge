import { Component, effect, input, signal } from '@angular/core';

@Component({
  selector: 'app-icon-preview-tile',
  imports: [],
  templateUrl: './icon-preview-tile.html',
  styleUrl: './icon-preview-tile.scss',
})
export class IconPreviewTile {
  readonly label = input.required<string>();
  readonly pngBytes = input.required<Uint8Array>();
  readonly showSafeZone = input(false);

  protected readonly imageUrl = signal<string | null>(null);

  constructor() {
    // Object URLs must be created/revoked imperatively (no signal-native equivalent), so this
    // stays an effect rather than a computed; onCleanup revokes the previous tile's URL whenever
    // pngBytes changes or the tile is destroyed, avoiding a blob URL leak per re-render.
    effect((onCleanup) => {
      // TS's typed-array lib types plain Uint8Array as buffer-generic (ArrayBuffer |
      // SharedArrayBuffer), which Blob's BlobPart doesn't accept; re-wrapping copies into a
      // concretely ArrayBuffer-backed view (cheap — these are a few KB) to satisfy that.
      const url = URL.createObjectURL(new Blob([new Uint8Array(this.pngBytes())], { type: 'image/png' }));
      this.imageUrl.set(url);
      onCleanup(() => URL.revokeObjectURL(url));
    });
  }
}
