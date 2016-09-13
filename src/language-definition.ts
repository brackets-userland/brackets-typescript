define((require, exports, module) => {

  const LanguageManager = brackets.getModule('language/LanguageManager');

  function defineLanguage(languageId, languageName, extension) {
    if (!LanguageManager.getLanguageForExtension(extension)) {
      LanguageManager.defineLanguage(languageId, {
        name: languageName,
        mode: ['javascript', 'text/typescript'],
        fileExtensions: [extension],
        blockComment: ['/*', '*/'],
        lineComment: ['//']
      });
    }
  }

  module.exports = () => {
    defineLanguage('typescript', 'TypeScript', 'ts');
    defineLanguage('tsx', 'TypeScript', 'tsx');
  };

});
