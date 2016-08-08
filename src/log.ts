define(function (require, exports, module) {
  'use strict';

  const PackageJson = JSON.parse(require('text!../package.json'));
  const EXTENSION_NAME = PackageJson.name;
  // const EXTENSION_UNIQUE_NAME = 'zaggino.' + EXTENSION_NAME;

  function ArrayFrom(object) {
    return [].slice.call(object);
  }

  function log(level, msgs) {
    return console[level].apply(console, ['[' + EXTENSION_NAME + ']'].concat(msgs));
  }

  exports.info = function () {
    return log('log', ArrayFrom(arguments));
  };

  exports.error = function () {
    return log('error', ArrayFrom(arguments));
  };

});
