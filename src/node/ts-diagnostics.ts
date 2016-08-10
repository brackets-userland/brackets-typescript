import * as log from './log';
import * as ts from 'typescript';
import { getTypeScriptProject, TypeScriptProject } from './ts-utils';
import { executeTsLint } from './tslint-utils';

export function createReportFromDiagnostics(diagnostics: ts.Diagnostic[]): CodeInspectionReport {
  return {
    errors: diagnostics.map((diagnostic: ts.Diagnostic) => {
      let line = 0;
      let ch = 0;
      if (diagnostic.file) {
        const lineChar = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        line = lineChar.line;
        ch = lineChar.character;
      }

      return {
        type: 'problem_type_error',
        message: 'TS' + diagnostic.code + ': ' + ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '),
        pos: { line, ch }
      };
    })
  };
}

export function getDiagnostics(projectRoot: string, filePath: string, fileContent: string, callback: (err?: Error, result?: CodeInspectionReport) => void): void {
  try {

    const project: TypeScriptProject = getTypeScriptProject(projectRoot);

    // refresh the file in the service host
    project.languageServiceHost.addFile(filePath, fileContent);

    // TODO: move this to getProject, we only need to run this when project configuration changes
    const generalDiagnostics = [].concat(
      project.program.getGlobalDiagnostics(),
      project.program.getOptionsDiagnostics()
    );
    if (generalDiagnostics.length > 0) {
      return callback(null, createReportFromDiagnostics(generalDiagnostics));
    }

    // run TypeScript file diagnostics
    const sourceFile = project.program.getSourceFile(filePath);
    const fileDiagnostics = [].concat(
      project.program.getDeclarationDiagnostics(sourceFile),
      project.program.getSemanticDiagnostics(sourceFile),
      project.program.getSyntacticDiagnostics(sourceFile)
    );
    if (fileDiagnostics.length > 0) {
      return callback(null, createReportFromDiagnostics(fileDiagnostics));
    }

    // if config for TSLint is present in the project, run TSLint checking
    if (project.tsLintConfig) {
      const errors = executeTsLint(filePath, fileContent, project.tsLintConfig, project.program);
      if (errors.length > 0) {
        return callback(null, { errors });
      }
    }

    // no errors found
    return callback(null, { errors: [] });
  } catch (err) {
    log.error(err.stack);
    return callback(err);
  }
};
