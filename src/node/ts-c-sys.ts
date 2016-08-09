import * as ts from 'typescript';
import {
  getDirectoryPath, hasProperty, copyListRemovingItem, FileSystemEntries, getNormalizedAbsolutePath,
  combinePaths, normalizePath, filter
} from './ts-c-core';
import { matchFiles } from './ts-c-matching';

export function getNodeSystem(): ts.System {
  const _fs = require("fs");
  const _path = require("path");
  const _os = require("os");
  const _crypto = require("crypto");

  const useNonPollingWatchers = process.env["TSC_NONPOLLING_WATCHER"];

  function createWatchedFileSet() {
      const dirWatchers: ts.Map<ts.DirectoryWatcher> = {};
      // One file can have multiple watchers
      const fileWatcherCallbacks: ts.Map<ts.FileWatcherCallback[]> = {};
      return { addFile, removeFile };

      function reduceDirWatcherRefCountForFile(fileName: string) {
          const dirName = getDirectoryPath(fileName);
          if (hasProperty(dirWatchers, dirName)) {
              const watcher = dirWatchers[dirName];
              watcher.referenceCount -= 1;
              if (watcher.referenceCount <= 0) {
                  watcher.close();
                  delete dirWatchers[dirName];
              }
          }
      }

      function addDirWatcher(dirPath: string): void {
          if (hasProperty(dirWatchers, dirPath)) {
              const watcher = dirWatchers[dirPath];
              watcher.referenceCount += 1;
              return;
          }

          const watcher: ts.DirectoryWatcher = _fs.watch(
              dirPath,
              { persistent: true },
              (eventName: string, relativeFileName: string) => fileEventHandler(eventName, relativeFileName, dirPath)
          );
          watcher.referenceCount = 1;
          dirWatchers[dirPath] = watcher;
          return;
      }

      function addFileWatcherCallback(filePath: string, callback: ts.FileWatcherCallback): void {
          if (hasProperty(fileWatcherCallbacks, filePath)) {
              fileWatcherCallbacks[filePath].push(callback);
          }
          else {
              fileWatcherCallbacks[filePath] = [callback];
          }
      }

      function addFile(fileName: string, callback: ts.FileWatcherCallback): ts.WatchedFile {
          addFileWatcherCallback(fileName, callback);
          addDirWatcher(getDirectoryPath(fileName));

          return { fileName, callback };
      }

      function removeFile(watchedFile: ts.WatchedFile) {
          removeFileWatcherCallback(watchedFile.fileName, watchedFile.callback);
          reduceDirWatcherRefCountForFile(watchedFile.fileName);
      }

      function removeFileWatcherCallback(filePath: string, callback: ts.FileWatcherCallback) {
          if (hasProperty(fileWatcherCallbacks, filePath)) {
              const newCallbacks = copyListRemovingItem(callback, fileWatcherCallbacks[filePath]);
              if (newCallbacks.length === 0) {
                  delete fileWatcherCallbacks[filePath];
              }
              else {
                  fileWatcherCallbacks[filePath] = newCallbacks;
              }
          }
      }

      function fileEventHandler(eventName: string, relativeFileName: string, baseDirPath: string) {
          // When files are deleted from disk, the triggered "rename" event would have a relativefileName of "undefined"
          const fileName = typeof relativeFileName !== "string"
              ? undefined
              : getNormalizedAbsolutePath(relativeFileName, baseDirPath);
          // Some applications save a working file via rename operations
          if ((eventName === "change" || eventName === "rename") && hasProperty(fileWatcherCallbacks, fileName)) {
              for (const fileCallback of fileWatcherCallbacks[fileName]) {
                  fileCallback(fileName);
              }
          }
      }
  }
  const watchedFileSet = createWatchedFileSet();

  function isNode4OrLater(): boolean {
      return parseInt(process.version.charAt(1)) >= 4;
  }

  const platform: string = _os.platform();
  // win32\win64 are case insensitive platforms, MacOS (darwin) by default is also case insensitive
  const useCaseSensitiveFileNames = platform !== "win32" && platform !== "win64" && platform !== "darwin";

  function readFile(fileName: string, encoding?: string): string {
      if (!fileExists(fileName)) {
          return undefined;
      }
      const buffer = _fs.readFileSync(fileName);
      let len = buffer.length;
      if (len >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
          // Big endian UTF-16 byte order mark detected. Since big endian is not supported by node.js,
          // flip all byte pairs and treat as little endian.
          len &= ~1;
          for (let i = 0; i < len; i += 2) {
              const temp = buffer[i];
              buffer[i] = buffer[i + 1];
              buffer[i + 1] = temp;
          }
          return buffer.toString("utf16le", 2);
      }
      if (len >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
          // Little endian UTF-16 byte order mark detected
          return buffer.toString("utf16le", 2);
      }
      if (len >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
          // UTF-8 byte order mark detected
          return buffer.toString("utf8", 3);
      }
      // Default is UTF-8 with no byte order mark
      return buffer.toString("utf8");
  }

  function writeFile(fileName: string, data: string, writeByteOrderMark?: boolean): void {
      // If a BOM is required, emit one
      if (writeByteOrderMark) {
          data = "\uFEFF" + data;
      }

      let fd: number;

      try {
          fd = _fs.openSync(fileName, "w");
          _fs.writeSync(fd, data, undefined, "utf8");
      }
      finally {
          if (fd !== undefined) {
              _fs.closeSync(fd);
          }
      }
  }

  function getAccessibleFileSystemEntries(path: string): FileSystemEntries {
      try {
          const entries = _fs.readdirSync(path || ".").sort();
          const files: string[] = [];
          const directories: string[] = [];
          for (const entry of entries) {
              // This is necessary because on some file system node fails to exclude
              // "." and "..". See https://github.com/nodejs/node/issues/4002
              if (entry === "." || entry === "..") {
                  continue;
              }
              const name = combinePaths(path, entry);

              let stat: any;
              try {
                  stat = _fs.statSync(name);
              }
              catch (e) {
                  continue;
              }

              if (stat.isFile()) {
                  files.push(entry);
              }
              else if (stat.isDirectory()) {
                  directories.push(entry);
              }
          }
          return { files, directories };
      }
      catch (e) {
          return { files: [], directories: [] };
      }
  }

  function readDirectory(path: string, extensions?: string[], excludes?: string[], includes?: string[]): string[] {
      return matchFiles(path, extensions, excludes, includes, useCaseSensitiveFileNames, process.cwd(), getAccessibleFileSystemEntries);
  }

  const enum FileSystemEntryKind {
      File,
      Directory
  }

  function fileSystemEntryExists(path: string, entryKind: FileSystemEntryKind): boolean {
    try {
      const stat = _fs.statSync(path);
      switch (entryKind) {
        case FileSystemEntryKind.File: return stat.isFile();
        case FileSystemEntryKind.Directory: return stat.isDirectory();
      }
    }
    catch (e) {
      return false;
    }
    return false;
  }

  function fileExists(path: string): boolean {
      return fileSystemEntryExists(path, FileSystemEntryKind.File);
  }

  function directoryExists(path: string): boolean {
      return fileSystemEntryExists(path, FileSystemEntryKind.Directory);
  }

  function getDirectories(path: string): string[] {
      return filter<string>(_fs.readdirSync(path), p => fileSystemEntryExists(combinePaths(path, p), FileSystemEntryKind.Directory));
  }

  const nodeSystem: ts.System = {
      args: process.argv.slice(2),
      newLine: _os.EOL,
      useCaseSensitiveFileNames: useCaseSensitiveFileNames,
      write(s: string): void {
          process.stdout.write(s);
      },
      readFile,
      writeFile,
      watchFile: (fileName, callback) => {
          if (useNonPollingWatchers) {
              const watchedFile = watchedFileSet.addFile(fileName, callback);
              return {
                  close: () => watchedFileSet.removeFile(watchedFile)
              };
          }
          else {
              _fs.watchFile(fileName, { persistent: true, interval: 250 }, fileChanged);
              return {
                  close: () => _fs.unwatchFile(fileName, fileChanged)
              };
          }

          function fileChanged(curr: any, prev: any) {
              if (+curr.mtime <= +prev.mtime) {
                  return;
              }

              callback(fileName);
          }
      },
      watchDirectory: (directoryName, callback, recursive) => {
          // Node 4.0 `fs.watch` function supports the "recursive" option on both OSX and Windows
          // (ref: https://github.com/nodejs/node/pull/2649 and https://github.com/Microsoft/TypeScript/issues/4643)
          let options: any;
          if (isNode4OrLater() && (process.platform === "win32" || process.platform === "darwin")) {
              options = { persistent: true, recursive: !!recursive };
          }
          else {
              options = { persistent: true };
          }

          return _fs.watch(
              directoryName,
              options,
              (eventName: string, relativeFileName: string) => {
                  // In watchDirectory we only care about adding and removing files (when event name is
                  // "rename"); changes made within files are handled by corresponding fileWatchers (when
                  // event name is "change")
                  if (eventName === "rename") {
                      // When deleting a file, the passed baseFileName is null
                      callback(!relativeFileName ? relativeFileName : normalizePath(combinePaths(directoryName, relativeFileName)));
                  };
              }
          );
      },
      resolvePath: function(path: string): string {
          return _path.resolve(path);
      },
      fileExists,
      directoryExists,
      createDirectory(directoryName: string) {
          if (!nodeSystem.directoryExists(directoryName)) {
              _fs.mkdirSync(directoryName);
          }
      },
      getExecutingFilePath() {
          return __filename;
      },
      getCurrentDirectory() {
          return process.cwd();
      },
      getDirectories,
      readDirectory,
      getModifiedTime(path) {
          try {
              return _fs.statSync(path).mtime;
          }
          catch (e) {
              return undefined;
          }
      },
      createHash(data) {
          const hash = _crypto.createHash("md5");
          hash.update(data);
          return hash.digest("hex");
      },
      getMemoryUsage() {
          if (global.gc) {
              global.gc();
          }
          return process.memoryUsage().heapUsed;
      },
      getFileSize(path) {
          try {
              const stat = _fs.statSync(path);
              if (stat.isFile()) {
                  return stat.size;
              }
          }
          catch (e) { }
          return 0;
      },
      exit(exitCode?: number): void {
          process.exit(exitCode);
      },
      realpath(path: string): string {
          return _fs.realpathSync(path);
      }
  };
  return nodeSystem;
}
