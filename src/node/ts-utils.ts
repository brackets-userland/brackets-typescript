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

export function getStuffForProject(projectRoot) {
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
