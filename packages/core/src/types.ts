export interface IconForgeConfig {
  /** Maskable safe-zone inset, as a percentage of the icon size on each side. Default 20. */
  maskablePadding: number;
  /**
   * Background color used to flatten the apple-touch-icon (iOS ignores alpha) and to
   * fill the full canvas behind the maskable safe zone. Any CSS color, e.g. "#ffffff".
   */
  background: string;
  /** theme-color value used in the generated head snippet. Defaults to `background`. */
  themeColor?: string;
}

export type ManifestIconPurpose = 'any' | 'maskable';

export interface ManifestIcon {
  /** Path relative to the web root (i.e. relative to `public/`, no "public/" prefix). */
  src: string;
  sizes: string;
  type: string;
  purpose: ManifestIconPurpose;
}
