define(function (require, exports, module) {
  'use strict';

  require('dist/language-definition')();
  require('dist/file-watching')();
  require('dist/code-inspection')();
  require('dist/code-hints')();

});
