import * as _log from './log';
import { combinePaths, normalizePath } from './ts-c-core';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const typescriptPath = normalizePath(path.dirname(require.resolve('typescript')));

export interface ScriptInfo {
  version: string;
  snapshot: ts.IScriptSnapshot;
}

export class TypeScriptLanguageServiceHost implements ts.LanguageServiceHost {

  private files: { [fileName: string]: ScriptInfo } = {};

  constructor (private projectDirectory: string, private compilationSettings: ts.CompilerOptions, fileNames: string[]) {
    fileNames.forEach(fileName => {
      this.getScriptSnapshot(fileName);
    });
  }

  addFile(fileName: string, text: string): ScriptInfo {
    const snapshot = ts.ScriptSnapshot.fromString(text);
    const version = this.getFileHash(text);
    this.files[fileName] = { version, snapshot };
    return this.files[fileName];
  }

  getFileHash(text: string): string {
    const hash = crypto.createHash('md5');
    hash.update(text);
    return hash.digest('hex');
  }

  getCompilationSettings(): ts.CompilerOptions {
    return this.compilationSettings;
  }

  getNewLine(): string {
    return '\n';
  }

  // SKIP: getProjectVersion?(): string;

  getScriptFileNames(): string[] {
    return Object.keys(this.files);
  }

  getScriptKind(fileName: string): ts.ScriptKind {
    const ext = fileName.substr(fileName.lastIndexOf('.'));
    switch (ext.toLowerCase()) {
      case '.js':
          return ts.ScriptKind.JS;
      case '.jsx':
          return ts.ScriptKind.JSX;
      case '.ts':
          return ts.ScriptKind.TS;
      case '.tsx':
          return ts.ScriptKind.TSX;
      default:
          return ts.ScriptKind.Unknown;
    }
  }

  // TODO: this could be done through MD5 hashing
  getScriptVersion(fileName: string): string {
    let text: string;
    try {
      text = fs.readFileSync(fileName, 'utf8');
      return this.addFile(fileName, text).version;
    } catch (e) {
      return '';
    }
  }

  // TODO: this should get from cache first, cache should be updated through watchers
  getScriptSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
    let text: string;
    try {
      text = fs.readFileSync(fileName, 'utf8');
      return this.addFile(fileName, text).snapshot;
    } catch (e) {
      return undefined;
    }
  }

  // SKIP: getLocalizedDiagnosticMessages?(): any;

  // SKIP: getCancellationToken?(): HostCancellationToken;

  getCurrentDirectory(): string {
    return this.projectDirectory;
  }

  getDefaultLibFileName(options: ts.CompilerOptions): string {
    return combinePaths(typescriptPath, ts.getDefaultLibFileName(options));
  }

  log(s: string): void {
    _log.info('TypeScriptLanguageServiceHost', s);
  }

  trace(s: string): void {
    _log.info('TypeScriptLanguageServiceHost', s);
  }

  error(s: string): void {
    _log.warn('TypeScriptLanguageServiceHost', s);
  }

  useCaseSensitiveFileNames(): boolean {
    return true;
  }

  // SKIP: resolveModuleNames?(moduleNames: string[], containingFile: string): ResolvedModule[];

  // SKIP: resolveTypeReferenceDirectives?(typeDirectiveNames: string[],
  // containingFile: string): ResolvedTypeReferenceDirective[];

  // TODO: cache this too to this.directories: { [directoryName: string] : boolean }
  directoryExists(directoryName: string): boolean {
    try {
      return fs.statSync(directoryName).isDirectory();
    } catch (e) {
      return false;
    }
  }

  // TODO: somehow cache this info
  getDirectories(directoryName: string): string[] {
    return fs.readdirSync(directoryName).reduce((result, p) => {
      if (this.directoryExists(combinePaths(directoryName, p))) {
        result.push(p);
      }
      return result;
    }, []);
  }

}
