import * as _ from 'lodash';
import * as log from './log';
import * as ts from 'typescript';
import { getStuffForProject, BTypeScriptProject } from './ts-utils';
import { mapDiagnostics } from './ts-diagnostics';

const escapeStringRegexp = require('escape-string-regexp');

function mapCompletions(completions: ts.CompletionInfo, currentWord) {
  const entries = _.get(completions, 'entries', []);

  let hints = _.sortBy(entries, function (entry) {
    let sort = entry.sortText;
    if (currentWord) {
      sort += entry.name.indexOf(currentWord) === 0 ? '0' : '1';
    }
    return sort + entry.name.toLowerCase();
  }).map(function (entry) { return entry.name; });

  if (currentWord) {
    const re = new RegExp('^' + escapeStringRegexp(currentWord), 'i');
    hints = hints.filter(function (h) { return re.test(h); });
  }

  return {
    hints: hints,
    match: currentWord,
    selectInitial: true,
    handleWideResults: false
  };
}

export function getCompletions(projectRoot, fullPath, code, position, callback) {
  const project: BTypeScriptProject = getStuffForProject(projectRoot);
  try {
    // TODO: project.compilerHost.addFile(fullPath, code);

    const codeBeforeCursor = code.slice(0, position);
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

    const languageService = (<any> project.languageService);
    const completions: ts.CompletionInfo = languageService.getCompletionsAtPosition(
      fullPath, position, isMemberCompletion
    );

    return callback(null, mapCompletions(completions, currentWord));
  } catch (err) {
    if (err.name === 'ReadConfigError') {
      return callback(null, mapDiagnostics([ err ]));
    }
    log.error(err);
    return callback(err);
  }
};
