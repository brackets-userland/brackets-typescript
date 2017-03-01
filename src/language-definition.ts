define((require, exports, module) => {

  const LanguageManager = brackets.getModule('language/LanguageManager');

  function defineLanguage({ id, name, mode, extension }: {
    id: string;
    name: string;
    mode: [string, string];
    extension: string;
  }) {
    if (!LanguageManager.getLanguageForExtension(extension)) {
      LanguageManager.defineLanguage(id, {
        name,
        mode,
        fileExtensions: [extension],
        blockComment: ['/*', '*/'],
        lineComment: ['//']
      });
    }
  }

  module.exports = () => {
    defineLanguage({
      id: 'typescript',
      name: 'TypeScript',
      mode: ['javascript', 'text/typescript'],
      extension: 'ts'
    });
    defineLanguage({
      id: 'tsx',
      name: 'TypeScript-JSX',
      mode: ['jsx', 'text/typescript-jsx'],
      extension: 'tsx'
    });
  };

});
