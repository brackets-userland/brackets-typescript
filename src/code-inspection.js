define(function (require, exports, module) {
  'use strict';

  var CodeInspection = brackets.getModule('language/CodeInspection');
  var ExtensionUtils = brackets.getModule('utils/ExtensionUtils');
  var NodeDomain = brackets.getModule('utils/NodeDomain');
  var ProjectManager = brackets.getModule('project/ProjectManager');

  var Log = require('./log');
  var PackageJson = JSON.parse(require('text!../package.json'));
  var EXTENSION_NAME = PackageJson.name;
  var EXTENSION_UNIQUE_NAME = 'zaggino.' + EXTENSION_NAME;
  var LINTER_NAME = 'TypeScript';
  var nodeDomain = new NodeDomain(EXTENSION_UNIQUE_NAME, ExtensionUtils.getModulePath(module, 'node-domain'));

  function handleScanFile(text, fullPath) {
    throw new Error(LINTER_NAME + ' sync code inspection is not available, use async for ' + fullPath);
  }

  function handleScanFileAsync(text, fullPath) {
    var deferred = new $.Deferred();
    var projectRoot = ProjectManager.getProjectRoot().fullPath;
    nodeDomain.exec('getDiagnostics', fullPath, projectRoot, text)
      .then(function (report) {
        Log.info('getDiagnostics results:' + JSON.stringify(report));
        deferred.resolve(report);
      }, function (err) {
        deferred.reject(err);
      });
    return deferred.promise();
  }

  ['typescript', 'tsx'].forEach(function (langId) {
    CodeInspection.register(langId, {
      name: LINTER_NAME,
      scanFile: handleScanFile,
      scanFileAsync: handleScanFileAsync
    });
  });

});
