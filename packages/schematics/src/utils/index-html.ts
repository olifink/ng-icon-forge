import type { Tree } from '@angular-devkit/schematics';
import type { StartTag } from 'parse5-sax-parser';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

/**
 * Tags ng-icon-forge owns in <head>: matched (and dropped) on the way through so a fresh
 * canonical copy — from core's getHeadSnippet() — can be inserted once, right before </head>.
 * This makes re-running the schematic idempotent instead of appending duplicate tags each time.
 */
const MANAGED_TAG_MATCHERS: Array<(tag: StartTag) => boolean> = [
  (tag) => tag.tagName === 'link' && tag.attrs.some((attr) => attr.name === 'rel' && attr.value === 'icon'),
  (tag) =>
    tag.tagName === 'link' && tag.attrs.some((attr) => attr.name === 'rel' && attr.value === 'apple-touch-icon'),
  (tag) => tag.tagName === 'meta' && tag.attrs.some((attr) => attr.name === 'name' && attr.value === 'theme-color'),
];

/**
 * Inserts/replaces the favicon, apple-touch-icon, and theme-color <head> tags in index.html,
 * using the same parse5 streaming-rewriter approach `@angular/pwa`'s own schematic uses for
 * HTML manipulation (rather than hand-rolled string/regex patching).
 */
export async function updateIndexHtmlHead(tree: Tree, indexHtmlPath: string, headSnippet: string): Promise<void> {
  const { RewritingStream } = await import('parse5-html-rewriting-stream');
  const original = tree.readText(indexHtmlPath);
  const rewriter = new RewritingStream();

  rewriter.on('startTag', (startTag) => {
    const isManaged = MANAGED_TAG_MATCHERS.some((matches) => matches(startTag));
    if (isManaged) {
      // Void elements (link/meta) have no matching endTag, so dropping here is sufficient.
      return;
    }
    rewriter.emitStartTag(startTag);
  });

  rewriter.on('endTag', (endTag) => {
    if (endTag.tagName === 'head') {
      const indented = headSnippet
        .split('\n')
        .map((line) => `  ${line}\n`)
        .join('');
      rewriter.emitRaw(indented);
    }
    rewriter.emitEndTag(endTag);
  });

  const chunks: Buffer[] = [];
  await pipeline(Readable.from(original), rewriter, async (source) => {
    for await (const chunk of source) {
      chunks.push(Buffer.from(chunk));
    }
  });

  tree.overwrite(indexHtmlPath, Buffer.concat(chunks));
}
