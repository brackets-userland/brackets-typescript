import { CodeInspectionReport } from '../node_modules/brackets-inspection-gutters/src/main.d.ts';

define(function (require, exports, module) {

  const CodeInspection = brackets.getModule('language/CodeInspection');
  const LanguageManager = brackets.getModule('language/LanguageManager');
  const ProjectManager = brackets.getModule('project/ProjectManager');
  const PackageJson = JSON.parse(require('text!../package.json'));
  const EXTENSION_NAME = PackageJson.name;
  const EXTENSION_UNIQUE_NAME = 'zaggino.' + EXTENSION_NAME;
  const nodeDomain = require('./node-domain');
  const log = require('./log');
  const LINTER_NAME = 'TypeScript';

  function handleScanFile(text, fullPath) {
    throw new Error(LINTER_NAME + ' sync code inspection is not available, use async for ' + fullPath);
  }

  function handleScanFileAsync(text, fullPath): JQueryPromise<CodeInspectionReport> {
    const deferred = $.Deferred();
    const projectRoot = ProjectManager.getProjectRoot().fullPath;
    nodeDomain.exec('getDiagnostics', projectRoot, fullPath, text)
      .then(function (report: CodeInspectionReport) {

        // set gutter marks using brackets-inspection-gutters module
        const w = (<any> window);
        if (w.bracketsInspectionGutters) {
          w.bracketsInspectionGutters.set(
            EXTENSION_UNIQUE_NAME, fullPath, report, true
          );
        } else {
          log.error(`No bracketsInspectionGutters found on window, gutters disabled.`);
        }

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
