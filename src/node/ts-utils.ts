import * as ts from 'typescript';
import * as TSLint from 'tslint';
import { IConfigurationFile } from 'tslint/lib/configuration';
import { TypeScriptLanguageServiceHost } from './language-service-host';
import { combinePaths, normalizePath } from './ts-c-core';

export interface TypeScriptProject {
  languageServiceHost: TypeScriptLanguageServiceHost;
  languageService: ts.LanguageService;
  tsLintConfig?: any;
}

const projects: { [projectRoot: string]: TypeScriptProject } = {};

function getTsLintConfig(projectRoot: string): IConfigurationFile {
  const tsLintConfigPath = TSLint.findConfigurationPath(null, projectRoot);
  return tsLintConfigPath ? TSLint.loadConfigurationFromPath(tsLintConfigPath) : null;
}

function parseConfigFile(projectRoot: string): ts.ParsedCommandLine {
  const config = ts.readConfigFile(combinePaths(projectRoot, 'tsconfig.json'), ts.sys.readFile).config;
  return ts.parseJsonConfigFileContent(config, ts.sys, projectRoot);
}

export function getTypeScriptProject(projectRoot): TypeScriptProject {
  projectRoot = normalizePath(projectRoot);

  if (projects[projectRoot]) {
    return projects[projectRoot];
  }

  const parsed = parseConfigFile(projectRoot);
  const options: ts.CompilerOptions = parsed.options;
  const fileNames: string[] = parsed.fileNames;
  const languageServiceHost = new TypeScriptLanguageServiceHost(projectRoot, options, fileNames);
  const languageService = ts.createLanguageService(languageServiceHost, ts.createDocumentRegistry());

  projects[projectRoot] = {
    languageServiceHost,
    languageService,
    tsLintConfig: getTsLintConfig(projectRoot)
  };

  return projects[projectRoot];
}

export function onProjectRefresh(projectRoot: string): void {
  projectRoot = normalizePath(projectRoot);
  if (projects[projectRoot]) {
    // re-initialize project
    delete projects[projectRoot];
    getTypeScriptProject(projectRoot);
  }
}

export function onProjectClose(projectRoot: string): void {
  projectRoot = normalizePath(projectRoot);
  delete projects[projectRoot];
}

export function onFileChange(notification: FileChangeNotification): void {
  notification.fullPath = normalizePath(notification.fullPath);
  Object.keys(projects).forEach(projectRoot => {

    const project = projects[projectRoot];

    const isInProject = notification.fullPath.indexOf(projectRoot) === 0;
    if (isInProject) {
      const relativePath = '/' + notification.fullPath.substring(projectRoot.length);
      if (relativePath === '/tsconfig.json') {
        const parsed = parseConfigFile(projectRoot);
        project.languageServiceHost._updateCompilationSettings(parsed.options);
      } else if (relativePath === '/tslint.json') {
        project.tsLintConfig = getTsLintConfig(projectRoot);
      }
    }

    if (notification.isFile) {
      project.languageServiceHost._wasFileModified(notification.fullPath);
    }

    if (notification.isDirectory) {
      project.languageServiceHost._wasDirectoryModified(notification.fullPath);
    }

  });
};
