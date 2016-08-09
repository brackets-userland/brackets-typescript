import * as ts from 'typescript';
import { hasProperty, getRootLength, getDirectoryPath, normalizePath, combinePaths, memoize } from './ts-c-core';
import { getNodeSystem } from './ts-c-sys';
import { isWatchSet, getNewLineCharacter } from './ts-c-utilities';

interface OutputFingerprint {
  hash: string;
  byteOrderMark: boolean;
  mtime: Date;
}

function _createCompilerHost(sys: ts.System, options: ts.CompilerOptions, setParentNodes?: boolean): ts.CompilerHost {
  const existingDirectories: ts.Map<boolean> = {};

  function getCanonicalFileName(fileName: string): string {
    // if underlying system can distinguish between two files whose names differs only in cases then file name already in canonical form.
    // otherwise use toLowerCase as a canonical form.
    return sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
  }

  function getSourceFile(fileName: string, languageVersion: ts.ScriptTarget, onError?: (message: string) => void): ts.SourceFile {
    let text: string;
    try {
      text = sys.readFile(fileName, options.charset);
    }
    catch (e) {
      if (onError) {
        onError(e.message);
      }
      text = "";
    }
    return text !== undefined ? ts.createSourceFile(fileName, text, languageVersion, setParentNodes) : undefined;
  }

  function directoryExists(directoryPath: string): boolean {
    if (hasProperty(existingDirectories, directoryPath)) {
      return true;
    }
    if (sys.directoryExists(directoryPath)) {
      existingDirectories[directoryPath] = true;
      return true;
    }
    return false;
  }

  function ensureDirectoriesExist(directoryPath: string) {
    if (directoryPath.length > getRootLength(directoryPath) && !directoryExists(directoryPath)) {
      const parentDirectory = getDirectoryPath(directoryPath);
      ensureDirectoriesExist(parentDirectory);
      sys.createDirectory(directoryPath);
    }
  }

  let outputFingerprints: ts.Map<OutputFingerprint>;

  function writeFileIfUpdated(fileName: string, data: string, writeByteOrderMark: boolean): void {
    if (!outputFingerprints) {
      outputFingerprints = {};
    }

    const hash = sys.createHash(data);
    const mtimeBefore = sys.getModifiedTime(fileName);

    if (mtimeBefore && hasProperty(outputFingerprints, fileName)) {
      const fingerprint = outputFingerprints[fileName];

      // If output has not been changed, and the file has no external modification
      if (
        fingerprint.byteOrderMark === writeByteOrderMark &&
        fingerprint.hash === hash &&
        fingerprint.mtime.getTime() === mtimeBefore.getTime()
      ) {
        return;
      }
    }

    sys.writeFile(fileName, data, writeByteOrderMark);

    const mtimeAfter = sys.getModifiedTime(fileName);

    outputFingerprints[fileName] = {
      hash,
      byteOrderMark: writeByteOrderMark,
      mtime: mtimeAfter
    };
  }

  function writeFile(fileName: string, data: string, writeByteOrderMark: boolean, onError?: (message: string) => void) {
    try {
      ensureDirectoriesExist(getDirectoryPath(normalizePath(fileName)));

      if (isWatchSet(options) && sys.createHash && sys.getModifiedTime) {
        writeFileIfUpdated(fileName, data, writeByteOrderMark);
      }
      else {
        sys.writeFile(fileName, data, writeByteOrderMark);
      }
    }
    catch (e) {
      if (onError) {
        onError(e.message);
      }
    }
  }

  function getDefaultLibLocation(): string {
    return getDirectoryPath(normalizePath(sys.getExecutingFilePath()));
  }

  const newLine = getNewLineCharacter(sys, options);
  const realpath = sys.realpath && ((path: string) => sys.realpath(path));

  return {
    getSourceFile,
    getDefaultLibLocation,
    getDefaultLibFileName: options => combinePaths(getDefaultLibLocation(), ts.getDefaultLibFileName(options)),
    writeFile,
    getCurrentDirectory: memoize(() => sys.getCurrentDirectory()),
    useCaseSensitiveFileNames: () => sys.useCaseSensitiveFileNames,
    getCanonicalFileName,
    getNewLine: () => newLine,
    fileExists: fileName => sys.fileExists(fileName),
    readFile: fileName => sys.readFile(fileName),
    trace: (s: string) => sys.write(s + newLine),
    directoryExists: directoryName => sys.directoryExists(directoryName),
    getDirectories: (path: string) => sys.getDirectories(path),
    realpath
  };
}

export function createCompilerHost(options: ts.CompilerOptions, setParentNodes?: boolean): ts.CompilerHost {
  const sys: ts.System = getNodeSystem();
  return _createCompilerHost(sys, options, setParentNodes);
}
