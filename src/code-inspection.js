define(function (require, exports, module) {
  'use strict';

  var CodeInspection = brackets.getModule('language/CodeInspection');
  var ProjectManager = brackets.getModule('project/ProjectManager');
  var nodeDomain = require('./node-domain');
  var log = require('./log');
  var LINTER_NAME = 'TypeScript';

  function handleScanFile(text, fullPath) {
    throw new Error(LINTER_NAME + ' sync code inspection is not available, use async for ' + fullPath);
  }

  function handleScanFileAsync(text, fullPath) {
    var deferred = new $.Deferred();
    var projectRoot = ProjectManager.getProjectRoot().fullPath;
    nodeDomain.exec('getDiagnostics', fullPath, projectRoot, text)
      .then(function (report) {
        log.info('getDiagnostics results:' + JSON.stringify(report));
        deferred.resolve(report);
      }, function (err) {
        deferred.reject(err);
      });
    return deferred.promise();
  }

  module.exports = function () {
    ['typescript', 'tsx'].forEach(function (langId) {
      CodeInspection.register(langId, {
        name: LINTER_NAME,
        scanFile: handleScanFile,
        scanFileAsync: handleScanFileAsync
      });
    });
  };

});
