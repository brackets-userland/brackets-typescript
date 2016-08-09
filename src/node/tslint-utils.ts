import * as TSLint from 'tslint';
import { ILinterOptionsRaw, LintResult } from 'tslint/lib/lint';

export function mapLintResultFailures(failures): Array<CodeInspectionError> {
  return failures ? failures.map(failure => {
    return {
      type: 'problem_type_warning',
      message: failure.failure + ' [' + failure.ruleName + ']',
      pos: {
        line: failure.startPosition.lineAndCharacter.line,
        ch: failure.startPosition.lineAndCharacter.character
      }
    };
  }) : [];
}

export function executeTsLint(fullPath, code, tsLintConfig, program): Array<CodeInspectionError> {
  try {
    const options: ILinterOptionsRaw = {
      configuration: tsLintConfig
    };
    const tsLinter = new TSLint(fullPath, code, options, program);
    const result: LintResult = tsLinter.lint();
    return mapLintResultFailures(result.failures);
  } catch (err) {
    return [{
      type: 'problem_type_error',
      message: `TSLintError: ${err.toString()}`,
      pos: { line: 0, ch: 0 }
    }];
  }
}
