import * as ts from 'typescript';
import * as TSLint from 'tslint';
import { IConfigurationFile } from 'tslint/lib/configuration';
import { TypeScriptLanguageServiceHost } from './language-service-host';
import { combinePaths, normalizePath } from './ts-path-utils';

export interface TypeScriptProject {
  languageServiceHost: TypeScriptLanguageServiceHost;
  languageService: ts.LanguageService;
  generalDiagnostics: ts.Diagnostic[];
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

  // we only need to run this when project configuration changes
  const program = languageService.getProgram();
  const generalDiagnostics = [].concat(
    program.getGlobalDiagnostics(),
    program.getOptionsDiagnostics()
  );

  projects[projectRoot] = {
    languageServiceHost,
    languageService,
    generalDiagnostics,
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
        onProjectRefresh(projectRoot);
        return;
      } else if (relativePath === '/tslint.json') {
        project.tsLintConfig = getTsLintConfig(projectRoot);
        return;
      }
    }

    if (notification.isFile) {
      const processed = project.languageServiceHost._wasFileModified(notification.fullPath);
      if (!processed) {
        // maybe a new file, which should be included in the project
        onProjectRefresh(projectRoot);
        return;
      }
    }

    if (notification.isDirectory) {
      project.languageServiceHost._wasDirectoryModified(notification.fullPath);
    }

  });
};
