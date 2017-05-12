import * as _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
import * as TSType from 'typescript';
import * as TSLintType from 'tslint';
import { IConfigurationFile } from 'tslint/lib/configuration';
import { TypeScriptLanguageServiceHost } from './language-service-host';
import { combinePaths, normalizePath } from './ts-path-utils';
import { getProjectPackage } from './package-resolver';

export interface TypeScriptProject {
  ts: typeof TSType;
  languageServiceHost: TypeScriptLanguageServiceHost;
  languageService: TSType.LanguageService;
  generalDiagnostics: TSType.Diagnostic[];
  TsLint?: typeof TSLintType;
  tsLintConfig?: IConfigurationFile;
  tsLintVersion?: string;
}

const projects: { [projectRoot: string]: TypeScriptProject } = {};
const tsconfigDirMap: { [directoryPath: string]: boolean } = {};

function getTsLintConfig(
  TSLint: typeof TSLintType,
  tsLintVersion: string,
  projectRoot: string
): IConfigurationFile {
  const versionMajor = parseInt(tsLintVersion, 10);
  if (versionMajor <= 3) {
    const oldTSLint = TSLint as any;
    const tsLintConfigPath = oldTSLint.findConfigurationPath(null, projectRoot);
    return tsLintConfigPath ? oldTSLint.loadConfigurationFromPath(tsLintConfigPath) : null;
  }
  const tsLintConfigPath = TSLint.Linter.findConfigurationPath(null, projectRoot);
  return tsLintConfigPath ? TSLint.Linter.loadConfigurationFromPath(tsLintConfigPath) : null;
}

function parseConfigFile(ts: typeof TSType, projectRoot: string): TSType.ParsedCommandLine {
  const config = ts.readConfigFile(combinePaths(projectRoot, 'tsconfig.json'), ts.sys.readFile).config;
  return ts.parseJsonConfigFileContent(config, ts.sys, projectRoot);
}

function hasTsconfigFile(directoryPath: string): boolean {
  if (directoryPath in tsconfigDirMap) {
    return tsconfigDirMap[directoryPath];
  }
  try {
    tsconfigDirMap[directoryPath] = fs.statSync(combinePaths(directoryPath, 'tsconfig.json')).isFile();
  } catch (err) {
    tsconfigDirMap[directoryPath] = false;
  }
  return tsconfigDirMap[directoryPath];
}

function dirsBetween(rootPath: string, filePath: string): string[] {
  const dirs = [];
  if (filePath.indexOf(rootPath) !== 0 || filePath === rootPath) {
    return dirs;
  }
  while (filePath.length > rootPath.length) {
    filePath = path.dirname(filePath);
    dirs.push(filePath);
  }
  return dirs;
}

export function getTypeScriptProject(projectRoot: string, filePath?: string): TypeScriptProject {
  projectRoot = normalizePath(projectRoot);

  if (filePath) {
    const newRoot = _.find(dirsBetween(projectRoot, normalizePath(filePath)), (dir) => hasTsconfigFile(dir));
    if (newRoot) {
      projectRoot = newRoot;
    }
  }

  if (projects[projectRoot]) {
    return projects[projectRoot];
  }

  const ts = getProjectPackage(projectRoot, 'typescript');
  const parsed = parseConfigFile(ts, projectRoot);
  const options: TSType.CompilerOptions = parsed.options;
  const fileNames: string[] = parsed.fileNames;
  const languageServiceHost = new TypeScriptLanguageServiceHost(ts, projectRoot, options, fileNames);
  const languageService = ts.createLanguageService(languageServiceHost, ts.createDocumentRegistry());

  // we only need to run this when project configuration changes
  const program = languageService.getProgram();
  const generalDiagnostics = [].concat(
    program.getGlobalDiagnostics(),
    program.getOptionsDiagnostics()
  );

  // we need to load TSLint that's local to the project root
  const TsLint = getProjectPackage(projectRoot, 'tslint');
  const TsLintPackageJson = getProjectPackage(projectRoot, 'tslint/package.json');

  projects[projectRoot] = {
    ts,
    languageServiceHost,
    languageService,
    generalDiagnostics,
    TsLint,
    tsLintVersion: TsLintPackageJson.version,
    tsLintConfig: getTsLintConfig(TsLint, TsLintPackageJson.version, projectRoot)
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
  Object.keys(projects).forEach((path) => {
    delete projects[path];
  });
  Object.keys(tsconfigDirMap).forEach((path) => {
    delete tsconfigDirMap[path];
  });
}

export function onFileChange(notification: FileChangeNotification): void {
  notification.fullPath = normalizePath(notification.fullPath);

  // if it's tsconfig.json, refresh its project
  if (/\/tsconfig\.json$/i.test(notification.fullPath)) {
    const parentDir = normalizePath(path.dirname(notification.fullPath));
    onProjectRefresh(parentDir);
    return;
  }

  // if it's tslint.json, update tsLintConfig of the project
  // and all of the projects under it, because they inherit configuration
  if (/\/tslint\.json$/i.test(notification.fullPath)) {
    const parentDir = normalizePath(path.dirname(notification.fullPath));
    Object.keys(projects).forEach((projectRoot) => {
      if (projectRoot.indexOf(parentDir) === 0) {
        onProjectRefresh(projectRoot);
      }
    });
    return;
  }

  // if it's a directory, clear the config file maps under it
  if (notification.isDirectory) {
    Object.keys(tsconfigDirMap).forEach((dirPath) => {
      if (dirPath.indexOf(notification.fullPath) === 0) {
        delete tsconfigDirMap[dirPath];
      }
    });
  }

  Object.keys(projects).forEach((projectRoot) => {

    const isInProject = notification.fullPath.indexOf(projectRoot) === 0;
    if (!isInProject) {
      return;
    }

    const project = projects[projectRoot];

    // if it's a file in the projectRoot
    if (notification.isFile) {
      const processed = project.languageServiceHost._wasFileModified(notification.fullPath);
      if (!processed) {
        // maybe a new file, which should be included in the project
        if (/\.tsx?$/i.test(notification.fullPath)) {
          onProjectRefresh(projectRoot);
          return;
        }
      }
    }

    // if it's a directory in the projectRoot
    if (notification.isDirectory) {
      project.languageServiceHost._wasDirectoryModified(notification.fullPath);
    }

  });
}
