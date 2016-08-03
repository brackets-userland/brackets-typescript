import Promise = require('bluebird');

const fs = require('fs');
const path = require('path');

export function endsWith(str: string, suffix: string): boolean {
  const expectedPos = str.length - suffix.length;
  return expectedPos >= 0 && str.indexOf(suffix, expectedPos) === expectedPos;
}

export function fileExtensionIs(path: string, extension: string): boolean {
  return path.length > extension.length && endsWith(path, extension);
}

export function fileExtensionIsAny(path: string, extensions: string[]): boolean {
  for (const extension of extensions) {
    if (fileExtensionIs(path, extension)) {
      return true;
    }
  }
  return false;
}

export function normalizePath(dirOrFilePath: string): string {
  return typeof dirOrFilePath === 'string' ? dirOrFilePath.replace(/\\/g, '/') : dirOrFilePath;
}

export function combinePaths(...paths: string[]): string {
  return normalizePath(path.join(...paths));
}

export function getFileSystemEntries(dirPath) {
  return fs.readdirAsync(dirPath).then((dirOrFiles: string[]) => {
    return Promise.all(dirOrFiles.map((dirOrFile: string) => {
      return fs.statAsync(path.join(dirPath, dirOrFile)).then((stat) => {
        return {
          dirOrFile: dirOrFile,
          isFile: stat.isFile(),
          isDirectory: stat.isDirectory()
        };
      });
    }));
  }).then(results => {
    return {
      files: results.filter(r => r.isFile).map(r => r.dirOrFile),
      directories: results.filter(r => r.isDirectory).map(r => r.dirOrFile)
    };
  });
}
