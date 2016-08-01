'use strict';

var _ = require('lodash');
var fs = require('fs');
var ts = require('typescript');
var log = require('./log');
var path = require('path');
var resolveSync = require('tsconfig').resolveSync;
var projects = {};

function throwError(error) {
  var err = new Error(error.messageText);
  err.name = 'ReadConfigError';
  err.code = error.code;
  err.messageText = error.messageText;
  throw err;
}

function readConfig(projectRoot) {
  var tsconfigPath = resolveSync(projectRoot);
  var tsconfigDir = tsconfigPath ? path.dirname(tsconfigPath) : projectRoot;
  var tsconfigContents = fs.readFileSync(tsconfigPath, 'utf8');

  var rawConfig = ts.parseConfigFileTextToJson(tsconfigPath, tsconfigContents);
  if (rawConfig.error) {
    throwError(rawConfig.error);
  }

  var settings = ts.convertCompilerOptionsFromJson(rawConfig.config.compilerOptions, tsconfigDir);
  if (settings.errors && settings.errors.length > 0) {
    throwError(settings.errors[0]);
  }

  return _.defaults(settings.options, ts.getDefaultCompilerOptions());
}

function createHost(projectRoot) {

  var files = [];

  function addFile(fileName, body) {
    var snap = ts.ScriptSnapshot.fromString(body);
    if (files[fileName]) {
      files[fileName].version += 1;
      files[fileName].snap = snap;
    } else {
      files[fileName] = { version: 1, snap: snap };
    }
  }

  function addFileSync(fileName) {
    fileName = fileName.replace(/\\/g, '/');
    addFile(fileName, fs.readFileSync(fileName, 'utf8'));
  }

  return {
    getCurrentDirectory: function () {
      return projectRoot;
    },
    getScriptFileNames: function () {
      return Object.keys(files);
    },
    getCompilationSettings: function () {
      return readConfig(projectRoot);
    },
    getDefaultLibFileName: function (options) {
      var defaultLibFileName = ts.getDefaultLibFilePath(options);
      addFileSync(defaultLibFileName);
      return defaultLibFileName;
    },
    addFile: addFile,
    getScriptIsOpen: function (fileName) {
      if (!files[fileName]) {
        log.error('getScriptIsOpen file not open yet: ' + fileName);
        addFileSync(fileName);
      }
      return !!files[fileName];
    },
    getScriptSnapshot: function (fileName) {
      if (!files[fileName]) {
        log.error('getScriptSnapshot file not open yet: ' + fileName);
        addFileSync(fileName);
      }
      return files[fileName] && files[fileName].snap;
    },
    getScriptVersion: function (fileName) {
      return files[fileName] && files[fileName].version.toString();
    }
  };
}

function getStuffForProject(projectRoot) {
  if (projects[projectRoot]) {
    return projects[projectRoot];
  }
  var host = createHost(projectRoot);
  var languageService = ts.createLanguageService(host, ts.createDocumentRegistry());
  // maybe add all .ts, .tsx files from projectRoot into the host now + add watching notifications
  projects[projectRoot] = {
    host: host,
    languageService: languageService
  };
  return projects[projectRoot];
}

function mapDiagnostics(diagnostics) {
  return {
    errors: diagnostics.map(function (diagnostic) {
      // sample: {"start":255,"length":1,"messageText":"Cannot find name 's'.","category":1,"code":2304}
      // sample2: { file: undefined, start: undefined, length: undefined,
      // messageText: 'Cannot find global type \'String\'.', category: 1, code: 2318 }
      var type = 'TypeScriptDiagnostic';
      var messageText = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ');
      var message = 'TS' + diagnostic.code + ': ' + messageText;

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

exports.getDiagnostics = function getDiagnostics(fullPath, projectRoot, code, callback) {
  try {
    var relativePath = path.relative(projectRoot, fullPath);
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
    return callback(null, mapDiagnostics(diagnostics));
  } catch (err) {
    if (err.name === 'ReadConfigError') {
      return callback(null, mapDiagnostics([ err ]));
    }
    log.error(err);
    return callback(err);
  }
};

exports.getCompletions = function getCompletions(fullPath, projectRoot, position, code, callback) {
  try {
    var relativePath = path.relative(projectRoot, fullPath);
    var obj = getStuffForProject(projectRoot);
    var host = obj.host;
    var languageService = obj.languageService;
    host.addFile(relativePath, code);

    var completions = languageService.getCompletionsAtPosition(relativePath, position, true);
    return callback(null, completions);
  } catch (err) {
    if (err.name === 'ReadConfigError') {
      return callback(null, mapDiagnostics([ err ]));
    }
    log.error(err);
    return callback(err);
  }
};
