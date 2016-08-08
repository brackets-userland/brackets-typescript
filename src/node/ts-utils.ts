'use strict';

import _ = require('lodash');
import fs = require('fs');
import path = require('path');
import Promise = require('bluebird');
import {
  getFileMatcherData, getFileMatcherPatterns, isDirectoryMatching,
  isFileMatching, matchFilesInDirectory, matchFilesInProject
} from './file-matching';
import { combinePaths, isAbsolutePath, normalizePath } from './fs-utils';
import * as log from './log';
import ReadConfigError from './read-config-error';
import { executeTsLint } from './tslint-utils';

const escapeStringRegexp = require('escape-string-regexp');
const readFile: (path: string, encoding: string) => Promise<any> = Promise.promisify(fs.readFile);
const ts = require('typescript');
const tsconfigResolveSync = require('tsconfig').resolveSync;
const TSLint = require('tslint');
const projects = {};

interface IConfigurationFile {
  extends?: string | string[];
  linterOptions?: {
      typeCheck?: boolean,
  };
  rulesDirectory?: string | string[];
  rules?: any;
}

function getProjectRoots(): string[] {
  return Object.keys(projects);
}

function readConfig(projectRoot) {
  const tsconfigPath = tsconfigResolveSync(projectRoot);
  const tsconfigContents = fs.readFileSync(tsconfigPath, 'utf8');

  const rawConfig = ts.parseConfigFileTextToJson(tsconfigPath, tsconfigContents);
  if (rawConfig.error) {
    throw new ReadConfigError(rawConfig.error.code, rawConfig.error.messageText);
  }

  return rawConfig.config;
}

function readCompilerOptions(projectRoot) {
  const tsconfigPath = tsconfigResolveSync(projectRoot);
  const tsconfigDir = tsconfigPath ? path.dirname(tsconfigPath) : projectRoot;
  const rawConfig = readConfig(projectRoot);

  const settings = ts.convertCompilerOptionsFromJson(rawConfig.compilerOptions, tsconfigDir);
  if (settings.errors && settings.errors.length > 0) {
    throw new ReadConfigError(settings.errors[0].code, settings.errors[0].messageText);
  }

  return _.defaults(settings.options, ts.getDefaultCompilerOptions());
}

function createHost(projectRoot) /*: LanguageServiceHost */ {

  const files = [];

  function addPackageJson(fileName: string, body: string): void {
    let packageJson;
    try {
      packageJson = JSON.parse(body);
    } catch (err) {
      log.error(`Error parsing ${fileName}: ${err}`);
      return;
    }
    if (typeof packageJson.typings === 'string') {
      addFileSync(path.resolve(path.dirname(fileName), packageJson.typings));
    }
  }

  function addFile(absolutePath: string, body?: string): void {
    if (!isAbsolutePath(absolutePath)) {
      const err = new Error(`addFile should receive : ${absolutePath}`);
      log.error(err.stack);
    }
    if (body && /\/package.json$/.test(absolutePath)) {
      addPackageJson(absolutePath, body);
      return;
    }
    if (body == null) {
      if (!files[absolutePath]) {
        files[absolutePath] = { snap: null, version: 1 };
      }
      return;
    }
    const snap = ts.ScriptSnapshot.fromString(body);
    if (files[absolutePath]) {
      files[absolutePath].version += 1;
      files[absolutePath].snap = snap;
    } else {
      files[absolutePath] = { snap, version: 1 };
    }
  }

  function addFileSync(absolutePath: string): void {
    if (files[absolutePath]) {
      return;
    }
    let contents = null;
    try {
      contents = fs.readFileSync(absolutePath, 'utf8');
    } catch (ignoreErr) {
      // log.error('Cannot open file (' + err.code + '): ' + absolutePath);
    }
    addFile(absolutePath, contents);
  }

  function addFileAsync(absolutePath: string): Promise<any> {
    return readFile(absolutePath, 'utf8')
      .catch(err => {
        log.error('Cannot open file (' + err.code + '): ' + absolutePath);
        return null;
      })
      .then(contents => {
        addFile(absolutePath, contents);
      });
  }

  return {
    $addFileSync: addFileSync,
    $addFileAsync: addFileAsync,
    getCurrentDirectory: function () {
      return projectRoot;
    },
    getScriptFileNames: function () {
      return Object.keys(files);
    },
    getCompilationSettings: function () {
      return readCompilerOptions(projectRoot);
    },
    getDefaultLibFileName: function (options) {
      const fileName = normalizePath(ts.getDefaultLibFilePath(options));
      addFileSync(fileName);
      return fileName;
    },
    addFile: addFile,
    getScriptIsOpen: function (fileName) {
      fileName = normalizePath(fileName);
      addFileSync(fileName);
      return files[fileName] && files[fileName].snap != null;
    },
    getScriptSnapshot: function (fileName) {
      fileName = normalizePath(fileName);
      addFileSync(fileName);
      return files[fileName] && files[fileName].snap;
    },
    getScriptVersion: function (fileName) {
      fileName = normalizePath(fileName);
      addFileSync(fileName);
      return files[fileName] && files[fileName].version.toString();
    }
  };
}

function getTsLintConfig(projectRoot: string): IConfigurationFile {
  const tsLintConfigPath = TSLint.findConfigurationPath(null, projectRoot);
  return tsLintConfigPath ? TSLint.loadConfigurationFromPath(tsLintConfigPath) : null;
}

function getStuffForProject(projectRoot) {
  projectRoot = normalizePath(projectRoot);
  if (projects[projectRoot]) {
    return Promise.resolve(projects[projectRoot]);
  }
  const host = createHost(projectRoot);
  const languageService = ts.createLanguageService(host, ts.createDocumentRegistry());

  const config = readConfig(projectRoot);
  const extensions: string[] = ['.ts', '.tsx'];
  const includes: string[] = config.files;
  const excludes: string[] = config.exclude;

  excludes.push('.git');
  if (config.compilerOptions.outDir) {
    excludes.push(config.compilerOptions.outDir);
  }

  const fileMatcherPatterns = getFileMatcherPatterns(projectRoot, extensions, excludes, includes);
  const fileMatcherData = getFileMatcherData(fileMatcherPatterns, extensions);
  return matchFilesInProject(projectRoot, fileMatcherPatterns.basePaths, fileMatcherData).then(files => {
    return Promise.all(files.map(function (relativePath) {
      return host.$addFileAsync(normalizePath(combinePaths(projectRoot, relativePath)));
    }));
  }).then(() => {
    projects[projectRoot] = {
      host,
      languageService,
      fileMatcherPatterns,
      fileMatcherData,
      tsLintConfig: getTsLintConfig(projectRoot)
    };
    return projects[projectRoot];
  });
}

function mapDiagnostics(diagnostics) {
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

export function fileChange(fileChangeNotification: FileChangeNotification): void {
  getProjectRoots().forEach(projectRoot => {
    if (fileChangeNotification.fullPath.indexOf(projectRoot) !== 0) {
      // not in this project
      return;
    }

    const projectConfig = projects[projectRoot];
    const relativePath = '/' + fileChangeNotification.fullPath.substring(projectRoot.length);

    if (relativePath === '/tslint.json') {
      projectConfig.tsLintConfig = getTsLintConfig(projectRoot);
    }

    if (fileChangeNotification.isFile && isFileMatching(relativePath, projectConfig.fileMatcherData)) {
      projectConfig.host.$addFileAsync(normalizePath(combinePaths(projectRoot, relativePath)));
      return;
    }

    if (fileChangeNotification.isDirectory && isDirectoryMatching(relativePath, projectConfig.fileMatcherData)) {
      matchFilesInDirectory(relativePath, combinePaths(projectRoot, relativePath), projectConfig.fileMatcherData)
        .then(files => files.map(file =>
          projectConfig.host.$addFileAsync(normalizePath(combinePaths(projectRoot, file)))
        ));
      return;
    }
  });
};

export function getDiagnostics(projectRoot, fullPath, code, callback) {
  return getStuffForProject(projectRoot).then(function _getDiagnostics(obj) {
    obj.host.addFile(fullPath, code);

    // TODO: create program with tslint helper method and
    // compare results of program.getSourceFiles(): SourceFile[]; and getRootFileNames

    /* TODO: delete
    const languageService = obj.languageService;

    // run compiler diagnostic first
    const compilerDiagnostics = languageService.getCompilerOptionsDiagnostics(fullPath);
    if (compilerDiagnostics.length > 0) {
      return callback(null, mapDiagnostics(compilerDiagnostics));
    }

    // run typescript diagnostics second
    const semanticDiagnostics = languageService.getSemanticDiagnostics(fullPath);
    const syntaxDiagnostics = languageService.getSyntacticDiagnostics(fullPath);
    const diagnostics = [].concat(semanticDiagnostics, syntaxDiagnostics);
    if (diagnostics.length > 0) {
      return callback(null, mapDiagnostics(diagnostics));
    }
    */

    const program /*: ts.Program */ = obj.languageService.getProgram();

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
    if (obj.tsLintConfig) {
      const errors = executeTsLint(fullPath, code, obj.tsLintConfig, program);
      if (errors.length > 0) {
        return callback(null, { errors });
      }
    }

    // no errors found
    return callback(null, { errors: [] });
  }).catch(function (err) {
    if (err.name === 'ReadConfigError') {
      return callback(null, mapDiagnostics([ err ]));
    }
    log.error(err);
    return callback(err);
  });
};

function mapCompletions(completions: CompletionInfo, currentWord) {
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
  return getStuffForProject(projectRoot).then(function _getCompletions(obj) {
    obj.host.addFile(fullPath, code);
    const languageService = obj.languageService;

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

    const completions: CompletionInfo = languageService.getCompletionsAtPosition(
      fullPath, position, isMemberCompletion
    );
    return callback(null, mapCompletions(completions, currentWord));
  }).catch(function (err) {
    if (err.name === 'ReadConfigError') {
      return callback(null, mapDiagnostics([ err ]));
    }
    log.error(err);
    return callback(err);
  });
};
