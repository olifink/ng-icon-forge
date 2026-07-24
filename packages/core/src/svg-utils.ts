const SVG_OPEN_TAG_RE = /<svg\b[^>]*>/i;
const VIEW_BOX_RE = /\bviewBox\s*=\s*["']([^"']+)["']/i;
const WIDTH_RE = /\bwidth\s*=\s*["']([\d.]+)[a-z%]*["']/i;
const HEIGHT_RE = /\bheight\s*=\s*["']([\d.]+)[a-z%]*["']/i;

interface ParsedSvg {
  viewBox: string;
  innerContent: string;
}

/**
 * Extracts the root `viewBox` (falling back to `width`/`height`) and the inner markup
 * of an SVG document. Uses a targeted regex rather than a full XML parser to keep this
 * package dependency-light; assumes well-formed, single-root SVG input (the expected
 * shape for an app icon source), not arbitrary/hostile XML.
 */
function parseSvg(svgString: string): ParsedSvg {
  const openTagMatch = svgString.match(SVG_OPEN_TAG_RE);
  if (!openTagMatch || openTagMatch.index === undefined) {
    throw new Error('ng-icon-forge: input does not look like an SVG document (no <svg> root element found).');
  }
  const openTag = openTagMatch[0];
  const openTagEnd = openTagMatch.index + openTag.length;
  const closeTagStart = svgString.lastIndexOf('</svg>');
  if (closeTagStart === -1 || closeTagStart < openTagEnd) {
    throw new Error('ng-icon-forge: input SVG is missing a closing </svg> tag.');
  }
  const innerContent = svgString.slice(openTagEnd, closeTagStart);

  const viewBoxMatch = openTag.match(VIEW_BOX_RE);
  if (viewBoxMatch) {
    return { viewBox: viewBoxMatch[1].trim(), innerContent };
  }

  const widthMatch = openTag.match(WIDTH_RE);
  const heightMatch = openTag.match(HEIGHT_RE);
  if (widthMatch && heightMatch) {
    return { viewBox: `0 0 ${widthMatch[1]} ${heightMatch[1]}`, innerContent };
  }

  throw new Error(
    'ng-icon-forge: source SVG has no viewBox and no numeric width/height to derive one from. ' +
      'Add a viewBox to the root <svg> element.',
  );
}

/**
 * Wraps the source SVG's content into a maskable-icon document: a full-bleed background
 * rect (so masked shapes like circle/squircle don't reveal transparency) plus the original
 * artwork scaled and centered into the inner safe zone, per the Android adaptive-icon spec.
 *
 * Re-nests only the *inner content* of the original SVG (not its own <svg> tag) inside a
 * fresh nested <svg> whose x/y/width/height position and scale it within the safe zone,
 * and whose viewBox reproduces the original coordinate system — avoiding ambiguity from
 * double-nesting two independently-sized <svg> elements.
 */
export function wrapMaskable(svgString: string, size: number, paddingPercent: number, background: string): string {
  const { viewBox, innerContent } = parseSvg(svgString);
  const inset = (size * paddingPercent) / 100;
  const innerSize = size - inset * 2;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<rect x="0" y="0" width="${size}" height="${size}" fill="${background}"/>` +
    `<svg x="${inset}" y="${inset}" width="${innerSize}" height="${innerSize}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">` +
    innerContent +
    `</svg>` +
    `</svg>`
  );
}
