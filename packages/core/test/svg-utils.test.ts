import { describe, expect, it } from 'vitest';
import { wrapMaskable } from '../src/svg-utils.js';

describe('wrapMaskable', () => {
  it('derives the safe-zone inset/size from the padding percentage', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24"/></svg>';
    const wrapped = wrapMaskable(svg, 192, 20, '#ffffff');

    // 20% padding on a 192px canvas -> 38.4px inset, 115.2px safe-zone content.
    expect(wrapped).toContain('width="192" height="192"');
    expect(wrapped).toContain('<rect x="0" y="0" width="192" height="192" fill="#ffffff"/>');
    expect(wrapped).toContain('x="38.4" y="38.4" width="115.2" height="115.2"');
    expect(wrapped).toContain('viewBox="0 0 24 24"');
  });

  it('falls back to width/height when viewBox is absent', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24"/></svg>';
    const wrapped = wrapMaskable(svg, 100, 10, '#000000');
    expect(wrapped).toContain('viewBox="0 0 24 24"');
  });

  it('re-nests only the inner content, not a duplicate <svg> root', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>';
    const wrapped = wrapMaskable(svg, 100, 10, '#fff');
    expect((wrapped.match(/<svg/g) ?? []).length).toBe(2); // outer canvas + inner safe-zone viewport
    expect(wrapped).toContain('<circle cx="12" cy="12" r="10"/>');
  });

  it('throws when there is no <svg> root element', () => {
    expect(() => wrapMaskable('<div/>', 100, 10, '#fff')).toThrow(/no <svg> root element/);
  });

  it('throws when there is neither viewBox nor width/height', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>';
    expect(() => wrapMaskable(svg, 100, 10, '#fff')).toThrow(/viewBox/);
  });
});
