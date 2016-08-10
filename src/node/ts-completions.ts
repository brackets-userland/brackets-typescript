import * as _ from 'lodash';
import * as log from './log';
import * as ts from 'typescript';
import { getTypeScriptProject, TypeScriptProject } from './ts-utils';

const fuzzaldrin: { filter: (list: any[], prefix: string, property?: { key: string }) => any } = require('fuzzaldrin');

function mapCompletions(completions: ts.CompletionInfo, prefix: string): CodeHintsReport {
  let entries: ts.CompletionEntry[] = completions ? completions.entries : [];

  log.info('mapCompletions', entries.length.toString(), prefix);

  if (prefix) {
    entries = fuzzaldrin.filter(entries, prefix, { key: 'name' });
  }

  entries = _.sortBy(entries, (entry: ts.CompletionEntry) => {
    let sort = entry.sortText;
    if (prefix) {
      if (entry.name.indexOf(prefix) === 0) {
        // starts with prefix case sensitive
        sort += '0';
      } else if (entry.name.toLowerCase().indexOf(prefix.toLowerCase()) === 0) {
        // starts with prefix case in-sensitive
        sort += '1';
      } else {
        // other matches (fuzzy search)
        sort += '2';
      }
    }
    return sort + entry.name.toLowerCase();
  });

  const MAX_COMPLETIONS = 50;
  if (entries.length > MAX_COMPLETIONS) {
    entries = entries.slice(0, MAX_COMPLETIONS);
  }

  return {
    hints: entries.map(entry => entry.name),
    match: prefix,
    selectInitial: true,
    handleWideResults: false
  };
}

export function getCompletions(
  projectRoot: string, filePath: string, fileContent: string, position: number,
  callback: (err?: Error, result?: CodeHintsReport) => void
): void {
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

    const completions = project.languageService.getCompletionsAtPosition(filePath, position);
    return callback(null, mapCompletions(completions, currentWord));
  } catch (err) {
    log.error(err.stack);
    return callback(err);
  }
};
