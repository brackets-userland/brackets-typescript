define((require, exports, module) => {
  'use strict';

  const ExtensionUtils = brackets.getModule('utils/ExtensionUtils');
  const NodeDomain = brackets.getModule('utils/NodeDomain');
  const PackageJson = JSON.parse(require('text!../package.json'));
  const EXTENSION_NAME = PackageJson.name;
  const EXTENSION_UNIQUE_NAME = 'zaggino.' + EXTENSION_NAME;
  const nodeDomain = new NodeDomain(EXTENSION_UNIQUE_NAME, ExtensionUtils.getModulePath(module, 'node/domain'));

  module.exports = nodeDomain;

});
