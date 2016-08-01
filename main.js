define(function (require, exports, module) {
  'use strict';

  var proceed = require('src/language-definition');
  if (!proceed) { return; }
  require('src/code-inspection')();
  require('src/code-hints')();

});
