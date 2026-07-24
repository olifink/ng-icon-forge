import { SchematicsException, type Rule, type Tree } from '@angular-devkit/schematics';
import {
  getHeadSnippet,
  getManifestColors,
  getManifestIcons,
  initWasm,
  renderIconSet,
  type IconForgeConfig,
} from '@ng-icon-forge/core';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, resolve } from 'node:path';
import { updateIndexHtmlHead } from '../utils/index-html.js';
import { mergeManifestIcons } from '../utils/manifest.js';
import { mergeNgswConfigIcons } from '../utils/ngsw-config.js';
import { resolveProjectPaths } from '../utils/project-paths.js';
import type { Schema } from './schema.js';

const require = createRequire(import.meta.url);

let wasmReady: Promise<void> | undefined;

/**
 * `core.renderIconSet` needs the resvg WASM module loaded first; core itself stays I/O-free
 * (see packages/core/src/wasm.ts), so reading the .wasm bytes is this consumer's job. Node can
 * read the file straight off disk from `@resvg/resvg-wasm`'s own package contents.
 */
function ensureWasmReady(): Promise<void> {
  if (!wasmReady) {
    const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');
    wasmReady = initWasm(readFileSync(wasmPath));
  }
  return wasmReady;
}

function readSourceSvg(svgOption: string): Buffer {
  const svgPath = isAbsolute(svgOption) ? svgOption : resolve(process.cwd(), svgOption);
  try {
    return readFileSync(svgPath);
  } catch (error) {
    throw new SchematicsException(`Could not read SVG file at "${svgPath}": ${(error as Error).message}`);
  }
}

/**
 * Remaps a core-generated path (namespaced under a generic "public/" prefix — see
 * packages/core/src/render-icon-set.ts) onto the actual target project's public directory,
 * which varies for multi-project workspaces (e.g. "projects/my-app/public").
 */
function toWorkspacePath(corePath: string, publicDir: string): string {
  return corePath.replace(/^public\//, `${publicDir}/`);
}

function toWebPath(corePath: string): string {
  return `/${corePath.replace(/^public\//, '')}`;
}

export default function ngAdd(options: Schema): Rule {
  return async (tree: Tree) => {
    if (!options.svg) {
      throw new SchematicsException(
        'The --svg option is required: point ng-icon-forge at your source icon, e.g. --svg ./logo.svg.',
      );
    }

    const svgBuffer = readSourceSvg(options.svg);
    await ensureWasmReady();

    const config: Partial<IconForgeConfig> = {
      maskablePadding: options.maskablePadding ?? 20,
      background: options.bg ?? '#ffffff',
    };

    const paths = await resolveProjectPaths(tree, options.project);
    const icons = renderIconSet(svgBuffer, config);

    for (const [corePath, buffer] of icons) {
      const workspacePath = toWorkspacePath(corePath, paths.publicDir);
      if (tree.exists(workspacePath)) {
        tree.overwrite(workspacePath, buffer);
      } else {
        tree.create(workspacePath, buffer);
      }
    }

    const manifestColors = getManifestColors(config);
    mergeManifestIcons(tree, paths.manifestPath, {
      icons: getManifestIcons(config),
      themeColor: manifestColors.theme_color,
      backgroundColor: manifestColors.background_color,
    });

    mergeNgswConfigIcons(tree, paths.ngswConfigPath, [...icons.keys()].map(toWebPath));

    await updateIndexHtmlHead(tree, paths.indexHtmlPath, getHeadSnippet(config));

    return tree;
  };
}
