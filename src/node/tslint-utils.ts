import * as _ from 'lodash';
import * as TSLintType from 'tslint';
import { ILinterOptionsRaw, LintResult } from 'tslint/lib/lint';

export function mapLintResultFailures(failures): Array<CodeInspectionError> {
  return (failures || []).map(failure => {
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
  tsLintConfig,
  program
): Array<CodeInspectionError> {
  try {
    const options: ILinterOptionsRaw = {
      configuration: tsLintConfig
    };
    const tsLinter = new TSLint(fullPath, code, options, program);
    const result: LintResult = tsLinter.lint();
    return _.sortBy(mapLintResultFailures(result.failures), item => item.pos.line);
  } catch (err) {
    return [{
      type: 'problem_type_error',
      message: `TSLintError: ${err.toString()}`,
      pos: { line: 0, ch: 0 }
    }];
  }
}
