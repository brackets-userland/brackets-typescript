export interface IConfigurationFile {
    extends?: string | string[];
    linterOptions?: {
        typeCheck?: boolean,
    };
    rulesDirectory?: string | string[];
    rules?: any;
}

export interface ILinterOptionsRaw {
    configuration?: any;
    formatter?: string;
    formattersDirectory?: string;
    rulesDirectory?: string | string[];
}

export interface LintResult {
    failureCount: number;
    failures: Array<any>;
    format: string;
    output: string;
}

export function mapLintFailures(failures) {
  return {
    errors: failures.map(failure => {
      return {
        type: 'TSLintError',
        message: failure.failure + ' [' + failure.ruleName + ']',
        pos: {
          line: failure.startPosition.lineAndCharacter.line,
          ch: failure.startPosition.lineAndCharacter.character
        }
      };
    })
  }
}
