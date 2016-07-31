define(function (require, exports, module) {
  'use strict';

  var LanguageManager = brackets.getModule('language/LanguageManager');
  var Log = require('./log');

  function defineLanguage(languageId, languageName, extension) {
    var existingDefinition = LanguageManager.getLanguageForExtension(extension);
    if (existingDefinition) {
      Log.error(extension + ' extension language already defined: ' + JSON.stringify(existingDefinition));
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

  defineLanguage('typescript', 'TypeScript', 'ts');
  defineLanguage('tsx', 'TypeScript', 'tsx');

});
