define(function (require, exports, module) {
  'use strict';

  var LanguageManager = brackets.getModule('language/LanguageManager');
  var log = require('./log');

  function defineLanguage(languageId, languageName, extension) {
    var existingDefinition = LanguageManager.getLanguageForExtension(extension);
    if (existingDefinition) {
      log.error(extension + ' extension language already defined: ' + JSON.stringify(existingDefinition));
      module.exports = false;
      return;
    }

    LanguageManager.defineLanguage(languageId, {
      name: languageName,
      mode: ['javascript', 'text/typescript'],
      fileExtensions: [extension],
      blockComment: ['/*', '*/'],
      lineComment: ['//']
    });
  }

  module.exports = true;
  defineLanguage('typescript', 'TypeScript', 'ts');
  defineLanguage('tsx', 'TypeScript', 'tsx');

});
