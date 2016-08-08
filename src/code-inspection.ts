define(function (require, exports, module) {
  'use strict';

  const CodeInspection = brackets.getModule('language/CodeInspection');
  const LanguageManager = brackets.getModule('language/LanguageManager');
  const ProjectManager = brackets.getModule('project/ProjectManager');
  const nodeDomain = require('./node-domain');
  const LINTER_NAME = 'TypeScript';

  function handleScanFile(text, fullPath) {
    throw new Error(LINTER_NAME + ' sync code inspection is not available, use async for ' + fullPath);
  }

  function handleScanFileAsync(text, fullPath) {
    const deferred = $.Deferred();
    const projectRoot = ProjectManager.getProjectRoot().fullPath;
    nodeDomain.exec('getDiagnostics', projectRoot, fullPath, text)
      .then(function (report) {
        deferred.resolve(report);
      }, function (err) {
        deferred.reject(err);
      });
    return deferred.promise();
  }

  module.exports = function () {
    ['ts', 'tsx'].forEach(function (extension) {
      const language = LanguageManager.getLanguageForExtension(extension);
      if (language) {
        CodeInspection.register(language.getId(), {
          name: LINTER_NAME,
          scanFile: handleScanFile,
          scanFileAsync: handleScanFileAsync
        });
      }
    });
  };

});
