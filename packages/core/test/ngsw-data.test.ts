import { describe, expect, it } from 'vitest';
import { NGSW_ICON_ASSET_GROUP_NAME, getNgswIconAssetGroup } from '../src/ngsw-data.js';

describe('getNgswIconAssetGroup', () => {
  it('names the group NGSW_ICON_ASSET_GROUP_NAME and sorts the file list', () => {
    const group = getNgswIconAssetGroup(['/icons/icon-96x96.png', '/favicon.ico', '/apple-touch-icon.png']);

    expect(group.name).toBe(NGSW_ICON_ASSET_GROUP_NAME);
    expect(group.installMode).toBe('lazy');
    expect(group.updateMode).toBe('prefetch');
    expect(group.resources.files).toEqual(['/apple-touch-icon.png', '/favicon.ico', '/icons/icon-96x96.png']);
  });

  it('does not mutate the input array', () => {
    const input = ['/b.png', '/a.png'];
    getNgswIconAssetGroup(input);
    expect(input).toEqual(['/b.png', '/a.png']);
  });
});
