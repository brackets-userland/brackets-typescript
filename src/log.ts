define((require, exports, module) => {
  'use strict';

  const PackageJson = JSON.parse(require('text!../package.json'));
  const EXTENSION_NAME = PackageJson.name;
  // const EXTENSION_UNIQUE_NAME = 'zaggino.' + EXTENSION_NAME;

  function log(level, msgs) {
    return console[level].apply(console, ['[' + EXTENSION_NAME + ']'].concat(msgs));
  }

  exports.info = (...args) => log('log', args);

  exports.error = (...args) => log('error', args);

});
