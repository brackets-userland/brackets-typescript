import * as ts from 'typescript';
import { CharacterCodes } from './ts-c-types';

const hasOwnProperty = Object.prototype.hasOwnProperty;

export interface FileSystemEntries {
  files: string[];
  directories: string[];
}

export interface FileMatcherPatterns {
  includeFilePattern: string;
  includeDirectoryPattern: string;
  excludePattern: string;
  basePaths: string[];
}

export function hasProperty<T>(map: ts.Map<T>, key: string): boolean {
  return hasOwnProperty.call(map, key);
}

export function getDirectoryPath(path: string): any {
  return path.substr(0, Math.max(getRootLength(path), path.lastIndexOf(directorySeparator)));
}

export function memoize<T>(callback: () => T): () => T {
  let value: T;
  return () => {
    if (callback) {
      value = callback();
      callback = undefined;
    }
    return value;
  };
}

export function copyListRemovingItem<T>(item: T, list: T[]) {
  const copiedList: T[] = [];
  for (const e of list) {
    if (e !== item) {
      copiedList.push(e);
    }
  }
  return copiedList;
}

function normalizedPathComponents(path: string, rootLength: number) {
  const normalizedParts = getNormalizedParts(path, rootLength);
  return [path.substr(0, rootLength)].concat(normalizedParts);
}

export function getNormalizedPathComponents(path: string, currentDirectory: string) {
  path = normalizeSlashes(path);
  let rootLength = getRootLength(path);
  if (rootLength === 0) {
    // If the path is not rooted it is relative to current directory
    path = combinePaths(normalizeSlashes(currentDirectory), path);
    rootLength = getRootLength(path);
  }
  return normalizedPathComponents(path, rootLength);
}

export function getNormalizedAbsolutePath(fileName: string, currentDirectory: string) {
  return getNormalizedPathFromPathComponents(getNormalizedPathComponents(fileName, currentDirectory));
}

export function getNormalizedPathFromPathComponents(pathComponents: string[]) {
  if (pathComponents && pathComponents.length) {
    return pathComponents[0] + pathComponents.slice(1).join(directorySeparator);
  }
  return null;
}

export function filter<T>(array: T[], f: (x: T) => boolean): T[] {
  let result: T[];
  if (array) {
    result = [];
    for (const item of array) {
      if (f(item)) {
        result.push(item);
      }
    }
  }
  return result;
}

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

export function removeTrailingDirectorySeparator(path: string) {
  if (path.charAt(path.length - 1) === directorySeparator) {
    return path.substr(0, path.length - 1);
  }
  return path;
}

export function isRootedDiskPath(path: string) {
  return getRootLength(path) !== 0;
}

export function contains<T>(array: T[], value: T): boolean {
  if (array) {
    for (const v of array) {
      if (v === value) {
        return true;
      }
    }
  }
  return false;
}

export function indexOfAnyCharCode(text: string, charCodes: number[], start?: number): number {
  for (let i = start || 0, len = text.length; i < len; i++) {
    if (contains(charCodes, text.charCodeAt(i))) {
      return i;
    }
  }
  return -1;
}

export const enum Comparison {
  LessThan    = -1,
  EqualTo     = 0,
  GreaterThan = 1
}

export function compareStrings(a: string, b: string, ignoreCase?: boolean): Comparison {
  if (a === b) return Comparison.EqualTo;
  if (a === undefined) return Comparison.LessThan;
  if (b === undefined) return Comparison.GreaterThan;
  if (ignoreCase) {
    if (String.prototype.localeCompare) {
      const result = a.localeCompare(b, /*locales*/ undefined, { usage: "sort", sensitivity: "accent" });
      return result < 0 ? Comparison.LessThan : result > 0 ? Comparison.GreaterThan : Comparison.EqualTo;
    }
    a = a.toUpperCase();
    b = b.toUpperCase();
    if (a === b) return Comparison.EqualTo;
  }
  return a < b ? Comparison.LessThan : Comparison.GreaterThan;
}

export function compareStringsCaseInsensitive(a: string, b: string) {
  return compareStrings(a, b, /*ignoreCase*/ true);
}

export function containsPath(parent: string, child: string, currentDirectory: string, ignoreCase?: boolean) {
  if (parent === undefined || child === undefined) return false;
  if (parent === child) return true;
  parent = removeTrailingDirectorySeparator(parent);
  child = removeTrailingDirectorySeparator(child);
  if (parent === child) return true;
  const parentComponents = getNormalizedPathComponents(parent, currentDirectory);
  const childComponents = getNormalizedPathComponents(child, currentDirectory);
  if (childComponents.length < parentComponents.length) {
    return false;
  }
  for (let i = 0; i < parentComponents.length; i++) {
    const result = compareStrings(parentComponents[i], childComponents[i], ignoreCase);
    if (result !== Comparison.EqualTo) {
      return false;
    }
  }
  return true;
}
