import * as fs from 'fs';
import * as ts from 'typescript';
import * as _log from './log';
import { combinePaths } from './ts-c-core';

export interface ScriptInfo {
  version: number;
  snapshot: ts.IScriptSnapshot;
}

export class TypeScriptLanguageServiceHost implements ts.LanguageServiceHost {

  private files: { [fileName: string] : ScriptInfo } = {};

  constructor (private projectDirectory: string, private compilationSettings: ts.CompilerOptions, fileNames: string[]) {
    fileNames.forEach(fileName => {
      this.getScriptSnapshot(fileName);
    });
  }

  addFile(fileName: string, text: string): ScriptInfo {
    const snapshot = ts.ScriptSnapshot.fromString(text);
    if (!this.files[fileName]) {
      this.files[fileName] = { version: 1, snapshot };
    } else {
      this.files[fileName].version++;
      this.files[fileName].snapshot = snapshot;
    }
    return this.files[fileName];
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
    const ext = fileName.substr(fileName.lastIndexOf("."));
    switch (ext.toLowerCase()) {
      case ".js":
          return ts.ScriptKind.JS;
      case ".jsx":
          return ts.ScriptKind.JSX;
      case ".ts":
          return ts.ScriptKind.TS;
      case ".tsx":
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
    } catch (e) {
      text = '';
    }
    return this.addFile(fileName, text).version.toString();
  }

  // TODO: this should get from cache first, cache should be updated through watchers
  getScriptSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
    let text: string;
    try {
      text = fs.readFileSync(fileName, 'utf8');
    } catch (e) {
      text = '';
    }
    return this.addFile(fileName, text).snapshot;
  }

  // SKIP: getLocalizedDiagnosticMessages?(): any;

  // SKIP: getCancellationToken?(): HostCancellationToken;

  getCurrentDirectory(): string {
    return this.projectDirectory;
  }

  // TODO: https://github.com/TypeStrong/atom-typescript/blob/8d43dd1b930a6df0ce62454a1560acfb7eee24c9/lib/main/lang/core/languageServiceHost2.ts#L205
  //getDefaultLibFileName(options: CompilerOptions): string;

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

  //resolveModuleNames?(moduleNames: string[], containingFile: string): ResolvedModule[];

  //resolveTypeReferenceDirectives?(typeDirectiveNames: string[], containingFile: string): ResolvedTypeReferenceDirective[];

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
