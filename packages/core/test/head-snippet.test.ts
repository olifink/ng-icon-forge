import { describe, expect, it } from 'vitest';
import { getHeadSnippet } from '../src/head-snippet.js';

describe('getHeadSnippet', () => {
  it('includes favicon, apple-touch-icon, and theme-color tags using the default background', () => {
    const snippet = getHeadSnippet();
    expect(snippet).toContain('<link rel="icon" href="favicon.ico" sizes="any">');
    expect(snippet).toContain('<link rel="apple-touch-icon" href="apple-touch-icon.png">');
    expect(snippet).toContain('<meta name="theme-color" content="#ffffff">');
  });

  it('uses an explicit themeColor over background when both are provided', () => {
    const snippet = getHeadSnippet({ background: '#000000', themeColor: '#ff00ff' });
    expect(snippet).toContain('<meta name="theme-color" content="#ff00ff">');
  });
});
