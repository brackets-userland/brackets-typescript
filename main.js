define(function (require, exports, module) {
  'use strict';

  require('./node_modules/brackets-inspection-gutters/dist/main')();
  require('dist/language-definition')();
  require('dist/file-watching')();
  require('dist/code-inspection')();
  require('dist/code-hints')();

});
