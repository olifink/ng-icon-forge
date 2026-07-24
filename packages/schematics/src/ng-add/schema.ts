/** Options for the `ng-icon-forge` `ng-add` schematic. Mirrors schema.json. */
export interface Schema {
  /** Path to the source SVG file to generate the icon set from. */
  svg: string;
  /** The project to add icons to. Auto-filled by the Angular CLI when omitted. */
  project?: string;
  /** Safe-zone padding percentage (per side) for maskable manifest icons. Default 20. */
  maskablePadding?: number;
  /** Background color for the apple-touch-icon and maskable icon canvas. Default "#ffffff". */
  bg?: string;
}
