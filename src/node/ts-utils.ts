import * as _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import * as log from './log';
import ReadConfigError from './read-config-error';
import { IConfigurationFile } from 'tslint/lib/configuration';
import { createCompilerHost } from './ts-c-program';
import { TypeScriptLanguageServiceHost } from './language-service-host';
import { normalizePath } from './ts-c-core';
import { getNodeSystem } from './ts-c-sys';

// const tsconfigResolveSync = require('tsconfig').resolveSync;
const TSLint = require('tslint');

export interface TypeScriptProject {
  languageServiceHost: TypeScriptLanguageServiceHost;
  languageService: ts.LanguageService;
  tsLintConfig?: any;
}

const projects: { [projectRoot: string]: TypeScriptProject } = {};

function getProjectRoots(): string[] {
  return Object.keys(projects);
}

/*
function readConfig(projectRoot) {
  const tsconfigPath = tsconfigResolveSync(projectRoot);
  const tsconfigContents = fs.readFileSync(tsconfigPath, 'utf8');

  const rawConfig = ts.parseConfigFileTextToJson(tsconfigPath, tsconfigContents);
  if (rawConfig.error) {
    throw new ReadConfigError(rawConfig.error.code, rawConfig.error.messageText);
  }

  return rawConfig.config;
}

function readCompilerOptions(projectRoot): ts.CompilerOptions {
  const tsconfigPath = tsconfigResolveSync(projectRoot);
  const tsconfigDir = tsconfigPath ? path.dirname(tsconfigPath) : projectRoot;
  const rawConfig = readConfig(projectRoot);

  const results: {
    options: ts.CompilerOptions;
    errors: ts.Diagnostic[];
  } = ts.convertCompilerOptionsFromJson(rawConfig.compilerOptions, tsconfigDir);

  if (results.errors && results.errors.length > 0) {
    throw new ReadConfigError(results.errors[0].code, results.errors[0].messageText);
  }

  return <ts.CompilerOptions> _.defaults(results.options, ts.getDefaultCompilerOptions());
}
*/

function getTsLintConfig(projectRoot: string): IConfigurationFile {
  const tsLintConfigPath = TSLint.findConfigurationPath(null, projectRoot);
  return tsLintConfigPath ? TSLint.loadConfigurationFromPath(tsLintConfigPath) : null;
}

export function getTypeScriptProject(projectRoot): TypeScriptProject {
  projectRoot = normalizePath(projectRoot);

  if (projects[projectRoot]) {
    return projects[projectRoot];
  }

  log.info(`creating TypeScript project ${projectRoot}`);
  const sys = getNodeSystem();
  const config = ts.readConfigFile('tsconfig.json', sys.readFile).config;
  const parsed: ts.ParsedCommandLine = ts.parseJsonConfigFileContent(config, sys, projectRoot);
  const options: ts.CompilerOptions = parsed.options;
  const fileNames: string[] = parsed.fileNames;
  // process.chdir(projectRoot);
  // const host = ts.createCompilerHost(options, true);
  // const program = ts.createProgram(fileNames, options, host);
  const languageServiceHost = new TypeScriptLanguageServiceHost(projectRoot, options, fileNames);
  const languageService: ts.LanguageService = ts.createLanguageService(languageServiceHost, ts.createDocumentRegistry());

  projects[projectRoot] = {
    languageServiceHost,
    languageService,
    tsLintConfig: getTsLintConfig(projectRoot)
  };

  return projects[projectRoot];

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
  /*
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
  */
};
