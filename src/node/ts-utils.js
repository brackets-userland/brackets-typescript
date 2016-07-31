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
  delete result.config.compilerOptions.outDir;
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

function mapDiagnostics(code, diagnostics) {
  return {
    errors: diagnostics.map(function (diagnostic) {
      // sample: {"start":255,"length":1,"messageText":"Cannot find name 's'.","category":1,"code":2304}
      // sample2: { file: undefined, start: undefined, length: undefined,
      // messageText: 'Cannot find global type \'String\'.', category: 1, code: 2318 }
      var type = 'TypeScriptDiagnostic';
      var message = 'TS' + diagnostic.code + ': ' + diagnostic.messageText;

      var line = 0;
      var ch = 0;
      if (diagnostic.file) {
        var lineChar = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        line = lineChar.line;
        ch = lineChar.character;
      }

      return {
        type: type,
        message: message,
        pos: {
          line: line,
          ch: ch
        }
      };
    })
  };
}

function standardizePath(str) {
  return str.split('/').join(path.sep);
}

exports.getDiagnostics = function getDiagnostics(fullPath, projectRoot, code, callback) {
  fullPath = standardizePath(fullPath);
  projectRoot = standardizePath(projectRoot);
  var relativePath = path.relative(projectRoot, fullPath);
  try {
    var obj = getStuffForProject(projectRoot);
    var host = obj.host;
    var languageService = obj.languageService;
    host.addFile(relativePath, code);

    var compilerDiagnostics = languageService.getCompilerOptionsDiagnostics(relativePath);
    if (compilerDiagnostics.length > 0) {
      return callback(null, mapDiagnostics(compilerDiagnostics));
    }

    var semanticDiagnostics = languageService.getSemanticDiagnostics(relativePath);
    var syntaxDiagnostics = languageService.getSyntacticDiagnostics(relativePath);
    var diagnostics = [].concat(semanticDiagnostics, syntaxDiagnostics);
    return callback(null, mapDiagnostics(code, diagnostics));
  } catch (err) {
    log.error(err);
    callback(err);
  }
};

exports.getCompletions = function getCompletions(fullPath, projectRoot, position, code, callback) {
  fullPath = standardizePath(fullPath);
  projectRoot = standardizePath(projectRoot);
  var relativePath = path.relative(projectRoot, fullPath);
  try {
    var obj = getStuffForProject(projectRoot);
    var host = obj.host;
    var languageService = obj.languageService;
    host.addFile(relativePath, code);
    var completions = languageService.getCompletionsAtPosition(relativePath, position, true);
    callback(null, completions);
  } catch (err) {
    callback(err);
  }
};
