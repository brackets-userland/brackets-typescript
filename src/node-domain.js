define(function (require, exports, module) {
  'use strict';

  var ExtensionUtils = brackets.getModule('utils/ExtensionUtils');
  var NodeDomain = brackets.getModule('utils/NodeDomain');
  var PackageJson = JSON.parse(require('text!../package.json'));
  var EXTENSION_NAME = PackageJson.name;
  var EXTENSION_UNIQUE_NAME = 'zaggino.' + EXTENSION_NAME;
  var nodeDomain = new NodeDomain(EXTENSION_UNIQUE_NAME, ExtensionUtils.getModulePath(module, 'node/domain'));

  module.exports = nodeDomain;

});
