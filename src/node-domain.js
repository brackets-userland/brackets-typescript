(function () {
  'use strict';

  var PackageJson = require('../package.json');
  var EXTENSION_NAME = PackageJson.name;
  var EXTENSION_UNIQUE_NAME = 'zaggino.' + EXTENSION_NAME;
  var domainName = EXTENSION_UNIQUE_NAME;
  var domainManager = null;

  function inspectFile(fullPath, projectRoot, callback) {
    // TODO: call errorsForFile
  }

  exports.init = function (_domainManager) {
    domainManager = _domainManager;

    if (!domainManager.hasDomain(domainName)) {
      domainManager.registerDomain(domainName, { major: 0, minor: 1 });
    }

    domainManager.registerCommand(
      domainName,
      'inspectFile', // command name
      inspectFile, // handler function
      true, // is async
      'inspectFile', // description
      [
        { name: 'fullPath', type: 'string' },
        { name: 'projectRoot', type: 'string' }
      ], [
        { name: 'report', type: 'object' }
      ]
    );
  };

}());
