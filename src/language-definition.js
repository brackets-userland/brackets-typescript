define(function (require, exports, module) {
  'use strict';

  var LanguageManager = brackets.getModule('language/LanguageManager');
  var Log = require('./log');

  var tsDefinition = LanguageManager.getLanguageForExtension('ts');
  if (tsDefinition) {
    Log.error('ts extension language already defined: ' + JSON.stringify(tsDefinition));
    return;
  }

  LanguageManager.defineLanguage('typescript', {
    name: 'TypeScript',
    mode: ['javascript', 'text/typescript'],
    fileExtensions: ['ts', 'tsx'],
    blockComment: ['/*', '*/'],
    lineComment: ['//']
  });

});
