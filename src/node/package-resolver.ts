import * as path from 'path';
import { normalizePath } from './ts-path-utils';

function tryLoad(packagePath: string): any {
  let result;
  try {
    result = require(packagePath);
  } catch (err) {
    result = null;
  }
  return result;
}

export function getProjectPackage(projectRoot: string, packageName: string): any {

  while (true) {
    // try to load the package
    const pathToLoad = normalizePath(path.join(projectRoot, 'node_modules', packageName));
    const result = tryLoad(pathToLoad);
    if (result != null) {
      return result;
    }
    // remove one level, try again
    const parent = path.dirname(projectRoot);
    if (projectRoot === parent) { break; }
    projectRoot = parent;
  }

  // fallback to one installed in here
  return require(packageName);
}
