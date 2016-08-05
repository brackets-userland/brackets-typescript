define(function (require, exports, module) {
  'use strict';

  var LanguageManager = brackets.getModule('language/LanguageManager');
  var log = require('./log');

  function defineLanguage(languageId, languageName, extension) {
    var existingDefinition = LanguageManager.getLanguageForExtension(extension);
    if (!existingDefinition) {
      LanguageManager.defineLanguage(languageId, {
        name: languageName,
        mode: ['javascript', 'text/typescript'],
        fileExtensions: [extension],
        blockComment: ['/*', '*/'],
        lineComment: ['//']
      });
    }
  }

  module.exports = function () {
    defineLanguage('typescript', 'TypeScript', 'ts');
    defineLanguage('tsx', 'TypeScript', 'tsx');
  };

});
