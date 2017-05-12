import * as path from 'path';
import { normalizePath } from './ts-path-utils';

export interface PackageResult {
  package: any;
  packagePath: string;
}

function tryLoad(pPath: string): PackageResult | null {
  let result;
  try {
    result = {
      package: require(pPath),
      packagePath: require.resolve(pPath)
    };
  } catch (err) {
    result = null;
  }
  return result;
}

export function getProjectPackage(projectRoot: string, packageName: string): PackageResult {

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
  return {
    package: require(packageName),
    packagePath: require.resolve(packageName)
  };
}
