import * as _ from 'lodash';
import * as log from './log';
import * as ts from 'typescript';
import { getTypeScriptProject, TypeScriptProject } from './ts-utils';
import { executeTsLint } from './tslint-utils';

export function mapDiagnostics(diagnostics) {
  return {
    errors: diagnostics.map(function (diagnostic) {
      // sample: {"start":255,"length":1,"messageText":"Cannot find name 's'.","category":1,"code":2304}
      // sample2: { file: undefined, start: undefined, length: undefined,
      // messageText: 'Cannot find global type \'String\'.', category: 1, code: 2318 }
      const messageText = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ');
      const message = 'TS' + diagnostic.code + ': ' + messageText;

      let line = 0;
      let ch = 0;
      if (diagnostic.file) {
        const lineChar = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        line = lineChar.line;
        ch = lineChar.character;
      }

      return {
        type: 'problem_type_error',
        message: message,
        pos: {
          line: line,
          ch: ch
        }
      };
    })
  };
}

export function getDiagnostics(projectRoot, fullPath, code, callback) {
  const project: TypeScriptProject = getTypeScriptProject(projectRoot);
  try {
    // TODO: obj.host.addFile(fullPath, code);

    const program: ts.Program = project.languageService.getProgram();

    const generalDiagnostics = [].concat(
      program.getGlobalDiagnostics(),
      program.getOptionsDiagnostics()
    );
    if (generalDiagnostics.length > 0) {
      return callback(null, mapDiagnostics(generalDiagnostics));
    }

    const sourceFile = program.getSourceFile(fullPath);

    const fileDiagnostics = [].concat(
      program.getDeclarationDiagnostics(sourceFile),
      program.getSemanticDiagnostics(sourceFile),
      program.getSyntacticDiagnostics(sourceFile)
    );
    if (fileDiagnostics.length > 0) {
      return callback(null, mapDiagnostics(fileDiagnostics));
    }

    // TODO: const typeChecker /*: ts.TypeChecker */ = program.getTypeChecker();

    // if config for TSLint is present in the project, run TSLint checking
    if (project.tsLintConfig) {
      const errors = executeTsLint(fullPath, code, project.tsLintConfig, program);
      if (errors.length > 0) {
        return callback(null, { errors });
      }
    }

    // no errors found
    return callback(null, { errors: [] });
  } catch (err) {
    if (err.name === 'ReadConfigError') {
      return callback(null, mapDiagnostics([ err ]));
    }
    log.error(err);
    return callback(err);
  }
};
