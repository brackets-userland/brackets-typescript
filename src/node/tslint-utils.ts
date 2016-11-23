import * as _ from 'lodash';
import * as TSLintType from 'tslint';
import { ILinterOptions, LintResult } from 'tslint/lib/index';
import { IConfigurationFile } from 'tslint/lib/configuration';

export function mapLintResultFailures(failures): CodeInspectionError[] {
  return (failures || []).map((failure) => {
    return {
      type: 'problem_type_warning',
      message: failure.failure + ' [' + failure.ruleName + ']',
      pos: {
        line: failure.startPosition.lineAndCharacter.line,
        ch: failure.startPosition.lineAndCharacter.character
      }
    };
  });
}

export function executeTsLint(
  fullPath: string,
  code: string,
  TSLint: typeof TSLintType,
  tsLintConfig: IConfigurationFile,
  tsLintVersion,
  program
): CodeInspectionError[] {
  const versionMajor = parseInt(tsLintVersion, 10);

  if (versionMajor <= 3) {
    try {
      const options = { configuration: tsLintConfig };
      const oldTSLint = TSLint as any;
      const tsLinter = new oldTSLint(fullPath, code, options, program);
      const result: LintResult = tsLinter.lint();
      return _.sortBy(mapLintResultFailures(result.failures), (item) => item.pos.line);
    } catch (err) {
      return [{
        type: 'problem_type_error',
        message: `TSLintError: ${err.toString()}`,
        pos: { line: 0, ch: 0 }
      }];
    }
  }

  try {
    const linterOptions: ILinterOptions = { fix: false };
    const tsLinter = new TSLint.Linter(linterOptions, program);
    tsLinter.lint(fullPath, code, tsLintConfig);
    const result: LintResult = tsLinter.getResult();
    return _.sortBy(mapLintResultFailures(result.failures), (item) => item.pos.line);
  } catch (err) {
    return [{
      type: 'problem_type_error',
      message: `TSLintError: ${err.toString()}`,
      pos: { line: 0, ch: 0 }
    }];
  }

}
