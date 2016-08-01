define(function (require, exports, module) {
  'use strict';

  var CodeHintManager = brackets.getModule('editor/CodeHintManager');
  var ProjectManager = brackets.getModule('project/ProjectManager');
  var nodeDomain = require('./node-domain');
  var log = require('./log');

  function TypeScriptHintProvider() {
    this.editor = null;
  }

  TypeScriptHintProvider.prototype.hasHints = function hasHints(editor, implicitChar) {
    this.editor = editor;
    return true;
  };

  TypeScriptHintProvider.prototype.getHints = function getHints(implicitChar) {
    var deferred = new $.Deferred();
    var projectRoot = ProjectManager.getProjectRoot().fullPath;
    var fullPath = this.editor.document.file.fullPath;
    var code = this.editor.document.getText();
    var position = this.editor.indexFromPos(this.editor.getCursorPos());
    nodeDomain.exec('getCompletions', projectRoot, fullPath, code, position, implicitChar)
    .then(function (results) {
      log.info('getCompletions results:' + JSON.stringify(results));
      deferred.resolve(results);
    }, function (err) {
      deferred.reject(err);
    });
    return deferred;
  };

  TypeScriptHintProvider.prototype.insertHint = function insertHint(hint) {

  };

  module.exports = function () {
    CodeHintManager.registerHintProvider(new TypeScriptHintProvider(), ['typescript', 'tsx'], 0);
  };

});
