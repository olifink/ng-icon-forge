import { Component, computed, effect, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { APPLE_TOUCH_ICON_SIZE, FAVICON_SIZES, ICON_SIZES, MASKABLE_SIZES } from '@ng-icon-forge/core';
import { IconPreviewTile } from './icon-preview-tile/icon-preview-tile';
import { IconForgeService } from './icon-forge.service';
import { buildIconZip } from './icon-zip';

interface LoadedSvg {
  fileName: string;
  text: string;
}

interface PreviewTileData {
  key: string;
  label: string;
  pngBytes: Uint8Array;
  isMaskable: boolean;
}

type RenderResult =
  | { status: 'empty' }
  | { status: 'ready'; icons: Map<string, Uint8Array> }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-root',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatToolbarModule,
    IconPreviewTile,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly svg = signal<LoadedSvg | null>(null);
  protected readonly appName = signal('My App');
  protected readonly background = signal('#ffffff');
  protected readonly maskablePadding = signal(20);
  protected readonly showSafeZone = signal(true);
  protected readonly isDragging = signal(false);
  protected readonly isZipping = signal(false);

  protected readonly renderResult = signal<RenderResult>({ status: 'empty' });

  protected readonly previewTiles = computed<PreviewTileData[]>(() => {
    const result = this.renderResult();
    if (result.status !== 'ready') {
      return [];
    }
    const tiles: PreviewTileData[] = [];
    for (const size of ICON_SIZES) {
      const pngBytes = result.icons.get(`public/icons/icon-${size}x${size}.png`);
      if (pngBytes) {
        tiles.push({ key: `any-${size}`, label: `${size}×${size}`, pngBytes, isMaskable: false });
      }
    }
    for (const size of MASKABLE_SIZES) {
      const pngBytes = result.icons.get(`public/icons/icon-maskable-${size}x${size}.png`);
      if (pngBytes) {
        tiles.push({ key: `maskable-${size}`, label: `Maskable ${size}×${size}`, pngBytes, isMaskable: true });
      }
    }
    const appleTouch = result.icons.get('public/apple-touch-icon.png');
    if (appleTouch) {
      tiles.push({
        key: 'apple-touch',
        label: `Apple touch (${APPLE_TOUCH_ICON_SIZE}×${APPLE_TOUCH_ICON_SIZE})`,
        pngBytes: appleTouch,
        isMaskable: false,
      });
    }
    return tiles;
  });

  protected readonly faviconSizesLabel = FAVICON_SIZES.join('/');

  constructor(protected readonly iconForge: IconForgeService) {
    effect(() => {
      const loaded = this.svg();
      const background = this.background();
      const maskablePadding = this.maskablePadding();
      const wasmReady = this.iconForge.wasmReady();

      if (!loaded) {
        this.renderResult.set({ status: 'empty' });
        return;
      }
      if (!wasmReady) {
        return; // effect re-runs once wasmReady flips true, since it's read above
      }
      try {
        const icons = this.iconForge.render(loaded.text, { background, maskablePadding });
        this.renderResult.set({ status: 'ready', icons });
      } catch (error) {
        this.renderResult.set({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  protected onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      void this.loadSvgFile(file);
    }
    input.value = ''; // allow re-selecting the same file name after a change
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      void this.loadSvgFile(file);
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  protected onDragLeave(): void {
    this.isDragging.set(false);
  }

  private async loadSvgFile(file: File): Promise<void> {
    if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
      this.renderResult.set({ status: 'error', message: `"${file.name}" doesn't look like an SVG file.` });
      return;
    }
    const text = await file.text();
    this.svg.set({ fileName: file.name, text });
  }

  protected onBackgroundInput(event: Event): void {
    this.background.set((event.target as HTMLInputElement).value);
  }

  protected onAppNameInput(event: Event): void {
    this.appName.set((event.target as HTMLInputElement).value);
  }

  protected onMaskablePaddingInput(event: Event): void {
    this.maskablePadding.set(Number((event.target as HTMLInputElement).value));
  }

  protected onShowSafeZoneChange(checked: boolean): void {
    this.showSafeZone.set(checked);
  }

  protected async downloadZip(): Promise<void> {
    const result = this.renderResult();
    if (result.status !== 'ready') {
      return;
    }
    this.isZipping.set(true);
    try {
      const blob = await buildIconZip(result.icons, {
        appName: this.appName(),
        background: this.background(),
        maskablePadding: this.maskablePadding(),
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ng-icon-forge-assets.zip';
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      this.isZipping.set(false);
    }
  }
}
