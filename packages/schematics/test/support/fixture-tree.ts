import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const collectionPath = fileURLToPath(new URL('../../collection.json', import.meta.url));

export function createRunner(): SchematicTestRunner {
  return new SchematicTestRunner('ng-icon-forge', collectionPath);
}

function readFixture(name: string): string {
  return readFileSync(fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url)), 'utf-8');
}

export const SAMPLE_SVG_PATH = fileURLToPath(new URL('../fixtures/sample-icon.svg', import.meta.url));

/**
 * Builds a Tree mirroring a real workspace captured from an actual `ng new` +
 * `ng add @angular/pwa` run (see test/fixtures/*), so merge logic is exercised against the
 * genuine shape of angular.json/ngsw-config.json/manifest.webmanifest/index.html rather than
 * a hand-guessed approximation.
 */
export function createFixtureTree(): Tree {
  const tree = Tree.empty();
  tree.create('angular.json', readFixture('angular.json'));
  tree.create('package.json', JSON.stringify({ name: 'fixture-app', version: '0.0.0' }, null, 2));
  tree.create('src/index.html', readFixture('index.html'));
  tree.create('public/manifest.webmanifest', readFixture('manifest.webmanifest'));
  tree.create('ngsw-config.json', readFixture('ngsw-config.json'));
  return tree;
}

/** A minimal two-project angular.json, for exercising the --project resolution paths. */
export function createMultiProjectTree(): Tree {
  const angularJson = {
    version: 1,
    projects: {
      'app-one': {
        projectType: 'application',
        root: 'projects/app-one',
        sourceRoot: 'projects/app-one/src',
        architect: { build: { builder: '@angular/build:application', options: {} } },
      },
      'app-two': {
        projectType: 'application',
        root: 'projects/app-two',
        sourceRoot: 'projects/app-two/src',
        architect: { build: { builder: '@angular/build:application', options: {} } },
      },
    },
  };

  const tree = Tree.empty();
  tree.create('angular.json', JSON.stringify(angularJson, null, 2));
  tree.create('package.json', JSON.stringify({ name: 'fixture-app', version: '0.0.0' }, null, 2));
  for (const project of ['app-one', 'app-two']) {
    tree.create(`projects/${project}/src/index.html`, readFixture('index.html'));
    tree.create(`projects/${project}/public/manifest.webmanifest`, readFixture('manifest.webmanifest'));
    tree.create(`projects/${project}/ngsw-config.json`, readFixture('ngsw-config.json'));
  }
  return tree;
}
