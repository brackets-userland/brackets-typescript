define(function (require, exports, module) {
  'use strict';

  var proceed = require('dist/language-definition');
  if (!proceed) { return; }
  require('dist/file-watching')();
  require('dist/code-inspection')();
  require('dist/code-hints')();

});
