import Promise = require('bluebird');
import { combinePaths, fileExtensionIsAny, getFileSystemEntries, normalizePath } from './fs-utils';

const ts = require('typescript');
const useCaseSensitiveFileNames: boolean = true;
const regexFlag: string = useCaseSensitiveFileNames ? '' : 'i';

export function getFileMatcherPatterns(
  projectRoot: string, extensions: string[], excludes: string[], includes: string[]
): FileMatcherPatterns {
  const path: string = '/';
  const currentDirectory: string = normalizePath(projectRoot);
  return ts.getFileMatcherPatterns(path, extensions, excludes, includes, useCaseSensitiveFileNames, currentDirectory);
}

export function getFileMatcherData(patterns: FileMatcherPatterns, extensions: string[]): FileMatcherData {
  return {
    includeFileRegex: patterns.includeFilePattern && new RegExp(patterns.includeFilePattern, regexFlag),
    includeDirectoryRegex: patterns.includeDirectoryPattern && new RegExp(patterns.includeDirectoryPattern, regexFlag),
    excludeRegex: patterns.excludePattern && new RegExp(patterns.excludePattern, regexFlag),
    extensions
  };
}

export function isFileMatching(name: string, fileMatcherData: FileMatcherData): boolean {
  if (
    (!fileMatcherData.extensions || fileExtensionIsAny(name, fileMatcherData.extensions)) &&
    (!fileMatcherData.includeFileRegex || fileMatcherData.includeFileRegex.test(name)) &&
    (!fileMatcherData.excludeRegex || !fileMatcherData.excludeRegex.test(name))
  ) {
    return true;
  }
  return false;
}

export function isDirectoryMatching(name: string, fileMatcherData: FileMatcherData): boolean {
  if (
    (!fileMatcherData.includeDirectoryRegex || fileMatcherData.includeDirectoryRegex.test(name)) &&
    (!fileMatcherData.excludeRegex || !fileMatcherData.excludeRegex.test(name))
  ) {
    return true;
  }
  return false;
}

export function matchFilesInDirectory(
  projectPath: string, absolutePath: string, fileMatcherData: FileMatcherData
): Promise<string[]> {
  return getFileSystemEntries(absolutePath).then((entries) => {
    const { files, directories } = entries;

    const matchedFiles = files.map((file: string) => {
      const name = combinePaths(projectPath, file);
      return isFileMatching(name, fileMatcherData) ? name : null;
    }).filter(x => x != null);

    return Promise.all(directories.map((directory: string) => {
      const name = combinePaths(projectPath, directory);
      if (isDirectoryMatching(name, fileMatcherData)) {
        const absoluteName = combinePaths(absolutePath, directory);
        return matchFilesInDirectory(name, absoluteName, fileMatcherData);
      }
      return null;
    })).then(visitDirectoryResults => {
      return matchedFiles.concat(...visitDirectoryResults.filter(x => x != null));
    });
  });
}

export function matchFilesInProject(
  projectRoot: string, basePaths: string[], fileMatcherData: FileMatcherData
): Promise<string[]> {
  return Promise.all(basePaths.map(function (basePath) {
    return matchFilesInDirectory(basePath, combinePaths(projectRoot, basePath), fileMatcherData);
  })).then(function (results: Array<Array<string>>) {
    return [].concat(...results);
  });
}
