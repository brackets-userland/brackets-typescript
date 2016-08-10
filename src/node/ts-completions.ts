import * as _ from 'lodash';
import * as log from './log';
import * as ts from 'typescript';
import { getTypeScriptProject, TypeScriptProject } from './ts-utils';

const escapeStringRegexp = require('escape-string-regexp');

function mapCompletions(completions: ts.CompletionInfo, currentWord: string): CodeHintsReport {
  const entries = _.get(completions, 'entries', []);

  let hints = _.sortBy(entries, (entry) => {
    let sort = entry.sortText;
    if (currentWord) {
      sort += entry.name.indexOf(currentWord) === 0 ? '0' : '1';
    }
    return sort + entry.name.toLowerCase();
  }).map(entry => entry.name);

  if (currentWord) {
    const re = new RegExp('^' + escapeStringRegexp(currentWord), 'i');
    hints = hints.filter(h => re.test(h));
  }

  return {
    hints: hints,
    match: currentWord,
    selectInitial: true,
    handleWideResults: false
  };
}

export function getCompletions(projectRoot: string, filePath: string, fileContent: string, position: number, callback: (err?: Error, result?: CodeHintsReport) => void): void {
  try {

    const project: TypeScriptProject = getTypeScriptProject(projectRoot);

    // refresh the file in the service host
    project.languageServiceHost.addFile(filePath, fileContent);

    const codeBeforeCursor = fileContent.slice(0, position);
    let isMemberCompletion = false;
    let currentWord = null;
    let match = codeBeforeCursor.match(/\.([\$_a-zA-Z0-9]*$)/);
    if (match && match.length > 0) {
      isMemberCompletion = true;
      currentWord = match[1];
    } else {
      match = codeBeforeCursor.match(/[\$_a-zA-Z0-9]+$/);
      currentWord = match ? match[0] : null;
    }

    // TODO: invalid typescript typings, we need to cast to <any> below to avoid compilation errors
    const completions: ts.CompletionInfo = (<any> project.languageService).getCompletionsAtPosition(
      filePath, position, isMemberCompletion
    );

    return callback(null, mapCompletions(completions, currentWord));
  } catch (err) {
    log.error(err.stack);
    return callback(err);
  }
};
