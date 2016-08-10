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

  addFile(fileName: string, text: string): ScriptInfo | void {
    if (typeof text !== 'string' || text.length === 0) {
      return this.readFile(fileName);
    }
    const snapshot = ts.ScriptSnapshot.fromString(text);
    const version = this.getFileHash(text);
    this.files[fileName] = { version, snapshot };
    return this.files[fileName];
  }

  clearFile(fileName: string): void {
    delete this.files[fileName];
  }

  readFile(fileName: string): ScriptInfo | void {
    try {
      const text = fs.readFileSync(fileName, 'utf8');
      return text.length > 0 ? this.addFile(fileName, text) : this.clearFile(fileName);
    } catch (e) {
      return this.clearFile(fileName);
    }
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

  // NOTE: this can only return '.ts', '.tsx' and '.d.ts' files
  getScriptFileNames(): string[] {
    return Object.keys(this.files).filter(file => /\.tsx?$/.test(file));
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

  getScriptVersion(fileName: string): string {
    // TODO: get from cache first
    const scriptInfo: ScriptInfo | void = this.readFile(fileName);
    return scriptInfo ? scriptInfo.version : '';
  }

  getScriptSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
    // TODO: get from cache first
    const scriptInfo: ScriptInfo | void = this.readFile(fileName);
    return scriptInfo ? scriptInfo.snapshot : undefined;
  }

  // SKIP: getLocalizedDiagnosticMessages?(): any;

  // SKIP: getCancellationToken?(): HostCancellationToken;

  getCurrentDirectory(): string {
    return this.projectDirectory;
  }

  getDefaultLibFileName(options: ts.CompilerOptions): string {
    return combinePaths(typescriptPath, ts.getDefaultLibFileName(options));
  }

  // log(s: string): void {
  //   _log.info('TypeScriptLanguageServiceHost', s);
  // }

  trace(s: string): void {
    _log.info('TypeScriptLanguageServiceHost', 'trace', s);
  }

  error(s: string): void {
    _log.warn('TypeScriptLanguageServiceHost', 'error', s);
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
