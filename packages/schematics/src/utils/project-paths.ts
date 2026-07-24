import { SchematicsException, type Tree } from '@angular-devkit/schematics';
import { readWorkspace, type ProjectDefinition } from '@schematics/angular/utility';
import { posix } from 'node:path';

export interface ProjectPaths {
  projectName: string;
  /** Workspace-relative path to the project's `public/` directory. */
  publicDir: string;
  /** Workspace-relative path to `public/manifest.webmanifest`. */
  manifestPath: string;
  /** Workspace-relative path to the project's `ngsw-config.json`. */
  ngswConfigPath: string;
  /** Workspace-relative path to the project's `index.html`. */
  indexHtmlPath: string;
}

async function resolveProject(
  tree: Tree,
  projectName: string | undefined,
): Promise<{ name: string; project: ProjectDefinition }> {
  const workspace = await readWorkspace(tree);

  if (projectName) {
    const project = workspace.projects.get(projectName);
    if (!project) {
      throw new SchematicsException(`Project "${projectName}" was not found in this workspace's angular.json.`);
    }
    return { name: projectName, project };
  }

  if (workspace.projects.size === 1) {
    const [name, project] = [...workspace.projects.entries()][0];
    return { name, project };
  }

  throw new SchematicsException(
    'This workspace has more than one project. Pass --project <name> to tell ng-icon-forge which one to update.',
  );
}

/**
 * Finds the `index` option from the project's build target (or its configurations), the same
 * way an explicit `index.html` override would be declared in angular.json. Falls back to
 * `undefined` when no target sets it explicitly — modern `@angular/build:application` projects
 * commonly omit it and rely on the conventional `<sourceRoot>/index.html`.
 */
function findConfiguredIndexPath(project: ProjectDefinition): string | undefined {
  for (const target of project.targets.values()) {
    const indexOption = target.options?.['index'];
    if (typeof indexOption === 'string') {
      return indexOption;
    }
    if (!target.configurations) {
      continue;
    }
    for (const configuration of Object.values(target.configurations)) {
      const configuredIndex = configuration?.['index'];
      if (typeof configuredIndex === 'string') {
        return configuredIndex;
      }
    }
  }
  return undefined;
}

export async function resolveProjectPaths(tree: Tree, projectName?: string): Promise<ProjectPaths> {
  const { name, project } = await resolveProject(tree, projectName);

  if (project.extensions['projectType'] !== 'application') {
    throw new SchematicsException(
      `Project "${name}" is not an application project; ng-icon-forge only supports application projects.`,
    );
  }

  const publicDir = posix.join(project.root, 'public');
  const sourceRoot = project.sourceRoot ?? posix.join(project.root, 'src');
  const indexHtmlPath = findConfiguredIndexPath(project) ?? posix.join(sourceRoot, 'index.html');

  return {
    projectName: name,
    publicDir,
    manifestPath: posix.join(publicDir, 'manifest.webmanifest'),
    ngswConfigPath: posix.join(project.root, 'ngsw-config.json'),
    indexHtmlPath,
  };
}
