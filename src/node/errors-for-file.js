/* eslint strict:[2,'global'] */
'use strict';

// from https://github.com/TypeStrong/atom-typescript/blob/master/lib/main/lang/projectService.ts#L394

var fsu = require('./fsu');
var path = require('path');
var projectByFilePath = {};

function consistentPath(query) {
  if (!query.filePath) { return; }
  query.filePath = fsu.consistentPath(query.filePath);
}

function getOrCreateProjectFile(filePath) {
  // If we are asked to look at stuff in lib.d.ts create its own project
  if (path.dirname(filePath) === languageServiceHost.typescriptDirectory) {
      return tsconfig.getDefaultInMemoryProject(filePath);
  }

  var projectFile = tsconfig.getProjectSync(filePath);
  queryParent.setConfigurationError({ projectFilePath: projectFile.projectFilePath, error: null });
  return projectFile;
}

function getOrCreateProject(filePath) {
  filePath = fsu.consistentPath(filePath);

  if (projectByFilePath[filePath]) {
    return projectByFilePath[filePath];
  }

  var projectFile = getOrCreateProjectFile(filePath);
  var project = cacheAndCreateProject(projectFile);
  return project;
}

module.exports = function errorsForFile(query) {
  consistentPath(query);

  var project;
  try {
    project = getOrCreateProject(query.filePath);
  } catch (ex) {
    return resolve({ errors: [] });
  }

  // for file path errors in transformer
  if (isTransformerFile(query.filePath)) {

    var filePath = transformer.getPseudoFilePath(query.filePath);
    var errors = getDiagnositcsByFilePath({ filePath: filePath }).map(building.diagnosticToTSError);
    errors.forEach(function (error) {
        error.filePath = query.filePath;
    });
    return resolve({ errors: errors });

  } else {

    var result;
    if (project.includesSourceFile(query.filePath)) {
      result = getDiagnositcsByFilePath(query).map(building.diagnosticToTSError);
    } else {
      result = notInContextResult(query.filePath);
    }
    return resolve({ errors: result });

  }
};
