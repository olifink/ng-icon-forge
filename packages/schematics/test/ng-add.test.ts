import { describe, expect, it } from 'vitest';
import { SAMPLE_SVG_PATH, createFixtureTree, createMultiProjectTree, createRunner } from './support/fixture-tree.js';

describe('ng-add', () => {
  it('writes the full icon set under public/icons, favicon.ico, and apple-touch-icon.png', async () => {
    const runner = createRunner();
    const tree = await runner.runSchematic('ng-add', { svg: SAMPLE_SVG_PATH }, createFixtureTree());

    const expectedFiles = [
      '/public/icons/icon-72x72.png',
      '/public/icons/icon-96x96.png',
      '/public/icons/icon-128x128.png',
      '/public/icons/icon-144x144.png',
      '/public/icons/icon-152x152.png',
      '/public/icons/icon-192x192.png',
      '/public/icons/icon-384x384.png',
      '/public/icons/icon-512x512.png',
      '/public/icons/icon-maskable-192x192.png',
      '/public/icons/icon-maskable-512x512.png',
      '/public/favicon.ico',
      '/public/apple-touch-icon.png',
    ];
    for (const file of expectedFiles) {
      expect(tree.files).toContain(file);
    }
  });

  it('replaces the manifest.webmanifest icons array and sets theme/background color', async () => {
    const runner = createRunner();
    const tree = await runner.runSchematic('ng-add', { svg: SAMPLE_SVG_PATH, bg: '#123456' }, createFixtureTree());

    const manifest = JSON.parse(tree.readContent('public/manifest.webmanifest'));
    expect(manifest.name).toBe('fixture-app'); // untouched field
    expect(manifest.icons).toHaveLength(10); // 8 "any" + 2 maskable
    expect(manifest.icons.some((icon: { purpose: string }) => icon.purpose === 'maskable')).toBe(true);
    expect(manifest.icons.every((icon: { src: string }) => !icon.src.startsWith('public/'))).toBe(true);
    expect(manifest.theme_color).toBe('#123456');
    expect(manifest.background_color).toBe('#123456');
  });

  it('merges icons into a dedicated ngsw-config.json assetGroup without touching other groups', async () => {
    const runner = createRunner();
    const tree = await runner.runSchematic('ng-add', { svg: SAMPLE_SVG_PATH }, createFixtureTree());

    const ngswConfig = JSON.parse(tree.readContent('ngsw-config.json'));
    expect(ngswConfig.assetGroups[0].name).toBe('ng-icon-forge-icons');
    expect(ngswConfig.assetGroups[0].resources.files).toContain('/favicon.ico');
    expect(ngswConfig.assetGroups[0].resources.files).toContain('/apple-touch-icon.png');
    expect(ngswConfig.assetGroups[0].resources.files).toContain('/icons/icon-72x72.png');

    // The pre-existing "app"/"assets" groups are byte-for-byte untouched.
    const appGroup = ngswConfig.assetGroups.find((g: { name: string }) => g.name === 'app');
    expect(appGroup.resources.files).toEqual([
      '/favicon.ico',
      '/index.csr.html',
      '/index.html',
      '/manifest.webmanifest',
      '/*.css',
      '/*.js',
    ]);
    const assetsGroup = ngswConfig.assetGroups.find((g: { name: string }) => g.name === 'assets');
    expect(assetsGroup.installMode).toBe('lazy');
  });

  it('inserts favicon/apple-touch-icon/theme-color tags into index.html, preserving the rest of <head>', async () => {
    const runner = createRunner();
    const tree = await runner.runSchematic('ng-add', { svg: SAMPLE_SVG_PATH, bg: '#abcdef' }, createFixtureTree());

    const html = tree.readContent('src/index.html');
    expect(html).toContain('<link rel="icon" href="favicon.ico" sizes="any">');
    expect(html).toContain('<link rel="apple-touch-icon" href="apple-touch-icon.png">');
    expect(html).toContain('<meta name="theme-color" content="#abcdef">');
    // Untouched pre-existing tags survive (parse5 may reformat their self-closing style,
    // so match on content rather than the exact original bracket syntax).
    expect(html).toContain('<title>FixtureApp</title>');
    expect(html).toMatch(/<link rel="manifest" href="manifest\.webmanifest"\s*\/?>/);
    expect(html).toContain('<app-root></app-root>');
    expect(html).toContain('<noscript>Please enable JavaScript to continue using this application.</noscript>');
    // The old favicon link isn't duplicated alongside the new one.
    expect(html.match(/rel="icon"/g)).toHaveLength(1);
  });

  it('is idempotent: running twice does not duplicate head tags or ngsw asset groups', async () => {
    const runner = createRunner();
    const once = await runner.runSchematic('ng-add', { svg: SAMPLE_SVG_PATH }, createFixtureTree());
    const twice = await runner.runSchematic('ng-add', { svg: SAMPLE_SVG_PATH }, once);

    const html = twice.readContent('src/index.html');
    expect(html.match(/rel="icon"/g)).toHaveLength(1);
    expect(html.match(/rel="apple-touch-icon"/g)).toHaveLength(1);
    expect(html.match(/name="theme-color"/g)).toHaveLength(1);

    const ngswConfig = JSON.parse(twice.readContent('ngsw-config.json'));
    expect(ngswConfig.assetGroups.filter((g: { name: string }) => g.name === 'ng-icon-forge-icons')).toHaveLength(1);
  });

  it('throws when --svg is missing', async () => {
    // schema.json's "required": ["svg"] means the schematics engine itself rejects this
    // before our factory ever runs (the Rule's own guard is defense-in-depth for callers
    // that compose ngAdd() programmatically and bypass schema validation).
    const runner = createRunner();
    await expect(runner.runSchematic('ng-add', {}, createFixtureTree())).rejects.toThrow(/required property 'svg'/);
  });

  it('throws a clear error when manifest.webmanifest does not exist', async () => {
    const runner = createRunner();
    const tree = createFixtureTree();
    tree.delete('public/manifest.webmanifest');
    await expect(runner.runSchematic('ng-add', { svg: SAMPLE_SVG_PATH }, tree)).rejects.toThrow(
      /ng add @angular\/pwa/,
    );
  });

  it('throws a clear error when ngsw-config.json does not exist', async () => {
    const runner = createRunner();
    const tree = createFixtureTree();
    tree.delete('ngsw-config.json');
    await expect(runner.runSchematic('ng-add', { svg: SAMPLE_SVG_PATH }, tree)).rejects.toThrow(
      /ng add @angular\/pwa/,
    );
  });

  it('throws when the workspace has multiple projects and --project is omitted', async () => {
    const runner = createRunner();
    await expect(runner.runSchematic('ng-add', { svg: SAMPLE_SVG_PATH }, createMultiProjectTree())).rejects.toThrow(
      /more than one project/,
    );
  });

  it('writes into the selected project when --project is given in a multi-project workspace', async () => {
    const runner = createRunner();
    const tree = await runner.runSchematic(
      'ng-add',
      { svg: SAMPLE_SVG_PATH, project: 'app-two' },
      createMultiProjectTree(),
    );

    expect(tree.files).toContain('/projects/app-two/public/icons/icon-72x72.png');
    expect(tree.files).not.toContain('/projects/app-one/public/icons/icon-72x72.png');
  });
});
