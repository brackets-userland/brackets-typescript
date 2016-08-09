import * as ts from 'typescript';

interface TypeScriptLanguageServiceHost extends ts.LanguageServiceHost {

}

export function createLanguageHost(): TypeScriptLanguageServiceHost {
  return {
    //getCompilationSettings(): CompilerOptions;
    //getNewLine?(): string;
    //getProjectVersion?(): string;
    //getScriptFileNames(): string[];
    //getScriptKind?(fileName: string): ScriptKind;
    //getScriptVersion(fileName: string): string;
    //getScriptSnapshot(fileName: string): IScriptSnapshot | undefined;
    //getLocalizedDiagnosticMessages?(): any;
    //getCancellationToken?(): HostCancellationToken;
    //getCurrentDirectory(): string;
    //getDefaultLibFileName(options: CompilerOptions): string;
    //log?(s: string): void;
    //trace?(s: string): void;
    //error?(s: string): void;
    //useCaseSensitiveFileNames?(): boolean;
    //resolveModuleNames?(moduleNames: string[], containingFile: string): ResolvedModule[];
    //resolveTypeReferenceDirectives?(typeDirectiveNames: string[], containingFile: string): ResolvedTypeReferenceDirective[];
    //directoryExists?(directoryName: string): boolean;
    //getDirectories?(directoryName: string): string[];
  };
}
