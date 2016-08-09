import * as ts from 'typescript';
import { CharacterCodes } from './ts-c-types';

const hasOwnProperty = Object.prototype.hasOwnProperty;

export const directorySeparator = "/";

export function hasProperty<T>(map: ts.Map<T>, key: string): boolean {
  return hasOwnProperty.call(map, key);
}

export function getRootLength(path: string): number {
  if (path.charCodeAt(0) === CharacterCodes.slash) {
    if (path.charCodeAt(1) !== CharacterCodes.slash) return 1;
    const p1 = path.indexOf("/", 2);
    if (p1 < 0) return 2;
    const p2 = path.indexOf("/", p1 + 1);
    if (p2 < 0) return p1 + 1;
    return p2 + 1;
  }
  if (path.charCodeAt(1) === CharacterCodes.colon) {
    if (path.charCodeAt(2) === CharacterCodes.slash) return 3;
    return 2;
  }
  // Per RFC 1738 'file' URI schema has the shape file://<host>/<path>
  // if <host> is omitted then it is assumed that host value is 'localhost',
  // however slash after the omitted <host> is not removed.
  // file:///folder1/file1 - this is a correct URI
  // file://folder2/file2 - this is an incorrect URI
  if (path.lastIndexOf("file:///", 0) === 0) {
    return "file:///".length;
  }
  const idx = path.indexOf("://");
  if (idx !== -1) {
    return idx + "://".length;
  }
  return 0;
}

export function getDirectoryPath(path: string): any {
  return path.substr(0, Math.max(getRootLength(path), path.lastIndexOf(directorySeparator)));
}

export function normalizeSlashes(path: string): string {
  return path.replace(/\\/g, "/");
}

export function lastOrUndefined<T>(array: T[]): T {
  if (array.length === 0) {
    return undefined;
  }
  return array[array.length - 1];
}

function getNormalizedParts(normalizedSlashedPath: string, rootLength: number) {
  const parts = normalizedSlashedPath.substr(rootLength).split(directorySeparator);
  const normalized: string[] = [];
  for (const part of parts) {
    if (part !== ".") {
      if (part === ".." && normalized.length > 0 && lastOrUndefined(normalized) !== "..") {
          normalized.pop();
      }
      else {
        // A part may be an empty string (which is 'falsy') if the path had consecutive slashes,
        // e.g. "path//file.ts".  Drop these before re-joining the parts.
        if (part) {
          normalized.push(part);
        }
      }
    }
  }
  return normalized;
}

export function normalizePath(path: string): string {
  path = normalizeSlashes(path);
  const rootLength = getRootLength(path);
  const normalized = getNormalizedParts(path, rootLength);
  return path.substr(0, rootLength) + normalized.join(directorySeparator);
}

export function combinePaths(path1: string, path2: string) {
  if (!(path1 && path1.length)) return path2;
  if (!(path2 && path2.length)) return path1;
  if (getRootLength(path2) !== 0) return path2;
  if (path1.charAt(path1.length - 1) === directorySeparator) return path1 + path2;
  return path1 + directorySeparator + path2;
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
