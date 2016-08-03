import { fileExtensionIsAny, normalizePath, combinePaths, getFileSystemEntries } from './fs-utils';

var ts = require('typescript');
var Promise = require('bluebird');

export function getFileMatcherPatterns(projectRoot: string, extensions: string[], excludes: string[], includes: string[]): FileMatcherPatterns {
  const path: string = '/';
  const useCaseSensitiveFileNames: boolean = true;
  const currentDirectory: string = normalizePath(projectRoot);
  return ts.getFileMatcherPatterns(path, extensions, excludes, includes, useCaseSensitiveFileNames, currentDirectory);
}

export function matchFilesInProject(projectRoot: string, patterns: FileMatcherPatterns, extensions: string[]) {
  const useCaseSensitiveFileNames: boolean = true;
  const regexFlag = useCaseSensitiveFileNames ? "" : "i";
  const includeFileRegex = patterns.includeFilePattern && new RegExp(patterns.includeFilePattern, regexFlag);
  const includeDirectoryRegex = patterns.includeDirectoryPattern && new RegExp(patterns.includeDirectoryPattern, regexFlag);
  const excludeRegex = patterns.excludePattern && new RegExp(patterns.excludePattern, regexFlag);

  function visitDirectory(projectPath: string, absolutePath: string) {
    return getFileSystemEntries(absolutePath).then((entries) => {
      const { files, directories } = entries;

      const matchedFiles = files.map((file: string) => {
        const name = combinePaths(projectPath, file);
        if (
          (!extensions || fileExtensionIsAny(name, extensions)) &&
          (!includeFileRegex || includeFileRegex.test(name)) &&
          (!excludeRegex || !excludeRegex.test(name))
        ) {
          return name;
        }
      }).filter(x => x != null);

      return Promise.all(directories.map((directory: string) => {
        const name = combinePaths(projectPath, directory);
        if (
          (!includeDirectoryRegex || includeDirectoryRegex.test(name)) &&
          (!excludeRegex || !excludeRegex.test(name))
        ) {
          const absoluteName = combinePaths(absolutePath, directory);
          return visitDirectory(name, absoluteName);
        }
      })).then(visitDirectoryResults => {
        return matchedFiles.concat(...visitDirectoryResults.filter(x => x != null));
      });
    });
  }

  return Promise.all(patterns.basePaths.map(function (basePath) {
    return visitDirectory(basePath, combinePaths(projectRoot, basePath));
  })).then(function (results: Array<Array<string>>) {
    return [].concat(...results);
  });
}
