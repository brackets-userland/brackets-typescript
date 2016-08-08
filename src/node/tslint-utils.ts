const TSLint = require('tslint');

interface ILinterOptionsRaw {
    configuration?: any;
    formatter?: string;
    formattersDirectory?: string;
    rulesDirectory?: string | string[];
}

interface ILintResult {
    failureCount: number;
    failures: Array<any>;
    format: string;
    output: string;
}

export function mapLintFailures(failures): Array<CodeInspectionError> {
  return failures ? failures.map(failure => {
    return {
      type: 'TSLintError',
      message: failure.failure + ' [' + failure.ruleName + ']',
      pos: {
        line: failure.startPosition.lineAndCharacter.line,
        ch: failure.startPosition.lineAndCharacter.character
      }
    };
  }) : [];
}

export function executeTsLint(fullPath, code, tsLintConfig, languageService): Array<CodeInspectionError> {
  try {
    const program = languageService.getProgram();
    const options: ILinterOptionsRaw = {
      configuration: tsLintConfig
    };
    const tsLinter = new TSLint(fullPath, code, options, program);
    const result: ILintResult = tsLinter.lint();
    return mapLintFailures(result.failures);
  } catch (err) {
    return [{
      type: 'TSLintError',
      message: `TSLintError: ${err.toString()}`,
      pos: { line: 0, ch: 0 }
    }];
  }
}
