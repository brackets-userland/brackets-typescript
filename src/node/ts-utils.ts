'use strict';

import _ = require('lodash');
import fs = require('fs');
import path = require('path');
import * as ts from 'typescript';
import { combinePaths, isAbsolutePath, normalizePath } from './fs-utils';
import * as log from './log';
import ReadConfigError from './read-config-error';
import { IConfigurationFile } from 'tslint/lib/configuration';
import { createCompilerHost } from './ts-c-program';

const tsconfigResolveSync = require('tsconfig').resolveSync;
const TSLint = require('tslint');
const projects = {};

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

function getTsLintConfig(projectRoot: string): IConfigurationFile {
  const tsLintConfigPath = TSLint.findConfigurationPath(null, projectRoot);
  return tsLintConfigPath ? TSLint.loadConfigurationFromPath(tsLintConfigPath) : null;
}

export interface BTypeScriptProject {
  compilerOptions: ts.CompilerOptions;
  compilerHost: ts.CompilerHost;
  languageService: ts.LanguageService;
  tsLintConfig?: any;
}

export function getStuffForProject(projectRoot): BTypeScriptProject {
  projectRoot = normalizePath(projectRoot);

  // set cwd to projectRoot because compiler checks where it's being launched from
  // later when we pass around projectRoot we can actually cache results of this function
  process.chdir(projectRoot);

  /*
  if (projects[projectRoot]) {
    return projects[projectRoot];
  }
  */

  const compilerOptions: ts.CompilerOptions = readConfig(projectRoot);
  const compilerHost: ts.CompilerHost = createCompilerHost(compilerOptions);
  const languageService: ts.LanguageService = ts.createLanguageService(compilerHost, ts.createDocumentRegistry());

  return {
    compilerOptions,
    compilerHost,
    languageService,
    tsLintConfig: getTsLintConfig(projectRoot)
  };

  /*
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
  */
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
