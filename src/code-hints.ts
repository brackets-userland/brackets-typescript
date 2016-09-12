define(function (require, exports, module) {
  'use strict';

  const CodeHintManager = brackets.getModule('editor/CodeHintManager');
  const LanguageManager = brackets.getModule('language/LanguageManager');
  const ProjectManager = brackets.getModule('project/ProjectManager');
  const nodeDomain = require('./node-domain');

  function TypeScriptHintProvider() {
    this.editor = null;
  }

  TypeScriptHintProvider.prototype.hasHints = function hasHints(editor, implicitChar) {
    this.editor = editor;
    return true;
  };

  TypeScriptHintProvider.prototype.getHints = function getHints(implicitChar) {
    if (implicitChar == null || !/^[\.\$_a-zA-Z0-9]$/.test(implicitChar)) {
      return null;
    }
    const deferred = $.Deferred();
    const projectRoot = ProjectManager.getProjectRoot().fullPath;
    const fullPath = this.editor.document.file.fullPath;
    const code = this.editor.document.getText();
    const position = this.editor.indexFromPos(this.editor.getCursorPos());
    nodeDomain.exec('getCompletions', projectRoot, fullPath, code, position)
    .then(function (results) {
      deferred.resolve(results);
    }, function (err) {
      deferred.reject(err);
    });
    return deferred;
  };

  TypeScriptHintProvider.prototype.insertHint = function insertHint(hint) {
    const cursorPos = this.editor.getCursorPos();
    const line = this.editor.document.getLine(cursorPos.line);

    const lineBeforeCursor = line.slice(0, cursorPos.ch);
    let wordBeforeCursor = lineBeforeCursor.match(/[\$_a-zA-Z0-9]+$/);
    wordBeforeCursor = wordBeforeCursor ? wordBeforeCursor[0] : '';

    const start = { line: cursorPos.line, ch: cursorPos.ch - wordBeforeCursor.length };
    const end = { line: cursorPos.line, ch: cursorPos.ch };
    this.editor.document.replaceRange(hint, start, end);
  };

  module.exports = function () {
    const langIds = ['ts', 'tsx'].map(function (extension) {
      const language = LanguageManager.getLanguageForExtension(extension);
      return language ? language.getId() : null;
    }).filter(x => x != null);
    CodeHintManager.registerHintProvider(new TypeScriptHintProvider(), langIds, 0);
  };

});
