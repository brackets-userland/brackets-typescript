'use strict';

var _ = require('lodash');
var ts = require('typescript');
var log = require('./log');
var path = require('path');
var loadSync = require('tsconfig').loadSync;
var projects = {};

function readConfig(projectRoot) {
  var result = loadSync(projectRoot);

  // Delete options that *should not* be passed through.
  delete result.config.compilerOptions.out;
  delete result.config.compilerOptions.outFile;

  // Add default compiler options to parsed config
  result.config.compilerOptions = _.defaults(result.config.compilerOptions, ts.getDefaultCompilerOptions());

  var basePath = result.path ? path.dirname(result.path) : projectRoot;
  return ts.parseJsonConfigFileContent(result.config, ts.sys, basePath, null, result.path);
}

function createHost(projectRoot) {
  var files = [];
  return {
    getCompilationSettings: function () {
      return readConfig(projectRoot);
    },
    getDefaultLibFileName: function (options) {
      return ts.getDefaultLibFilePath(options);
    },
    getCurrentDirectory: function () {
      return projectRoot;
    },
    getScriptFileNames: function () {
      return Object.keys(files);
    },
    getScriptIsOpen: function () {
      return true;
    },
    addFile: function (fileName, body) {
      var snap = ts.ScriptSnapshot.fromString(body);
      if (files[fileName]) {
        files[fileName].version += 1;
        files[fileName].snap = snap;
      } else {
        files[fileName] = { version: 1, snap: snap };
      }
    },
    getScriptSnapshot: function (fileName) {
      return files[fileName] && files[fileName].snap;
    },
    getScriptVersion: function (fileName) {
      var version = files[fileName] && files[fileName].version.toString();
      log.info(fileName, version);
      return version;
    }
  };
}

function getStuffForProject(projectRoot) {
  if (projects[projectRoot]) {
    return projects[projectRoot];
  }
  var host = createHost(projectRoot);
  var languageService = ts.createLanguageService(host, ts.createDocumentRegistry());
  projects[projectRoot] = {
    host: host,
    languageService: languageService
  };
  return projects[projectRoot];
}

function mapDiagnostics(code, semanticDiagnostics, syntaxDiagnostics) {
  var diagnostics = semanticDiagnostics.concat(syntaxDiagnostics);
  return {
    errors: diagnostics.map(function (diagnostic) {
      // sample: {"start":255,"length":1,"messageText":"Cannot find name 's'.","category":1,"code":2304}
      var message = 'T' + diagnostic.code + ': ' + diagnostic.messageText;
      var lines = code.slice(0, diagnostic.start).split('\n');
      var line = lines.length - 1;
      var ch = lines[line].length;
      var type = 'TODO';
      return {
        message: message,
        pos: { line: line, ch: ch },
        type: type
      };
    })
  };
}

exports.getDiagnostics = function getDiagnostics(fullPath, projectRoot, code, callback) {
  try {
    var obj = getStuffForProject(projectRoot);
    var host = obj.host;
    var languageService = obj.languageService;
    var relativePath = path.relative(projectRoot, fullPath);
    host.addFile(relativePath, code);
    var semanticDiagnostics = languageService.getSemanticDiagnostics(relativePath);
    var syntaxDiagnostics = languageService.getSyntacticDiagnostics(relativePath);
    callback(null, mapDiagnostics(code, semanticDiagnostics, syntaxDiagnostics));
  } catch (err) {
    log.error(err);
    callback(err);
  }
};

exports.getCompletions = function getCompletions(fullPath, projectRoot, position, code, callback) {
  try {
    var obj = getStuffForProject(projectRoot);
    var host = obj.host;
    var languageService = obj.languageService;
    var relativePath = path.relative(projectRoot, fullPath);
    host.addFile(relativePath, code);
    var completions = languageService.getCompletionsAtPosition(relativePath, position, true);
    callback(null, completions);
  } catch (err) {
    callback(err);
  }
};
