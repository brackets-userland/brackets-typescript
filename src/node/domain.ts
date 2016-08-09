'use strict';

if (!global.Promise) {
  require('any-promise/register/bluebird');
}

import { getCompletions } from './ts-completions';
import { getDiagnostics } from './ts-diagnostics';
import { fileChange } from './ts-utils';

const PackageJson = require('../../package.json');
const EXTENSION_NAME = PackageJson.name;
const EXTENSION_UNIQUE_NAME = 'zaggino.' + EXTENSION_NAME;
const domainName = EXTENSION_UNIQUE_NAME;
let domainManager = null;

exports.init = function (_domainManager) {
  domainManager = _domainManager;

  if (!domainManager.hasDomain(domainName)) {
    domainManager.registerDomain(domainName, { major: 0, minor: 1 });
  }

  domainManager.registerCommand(
    domainName,
    'fileChange', // command name
    fileChange, // handler function
    false, // is not async
    'fileChange', // description
    [
      { name: 'fileChangeNotification', type: 'object' }
    ], [
      { name: 'processed', type: 'boolean' }
    ]
  );

  domainManager.registerCommand(
    domainName,
    'getDiagnostics', // command name
    getDiagnostics, // handler function
    true, // is async
    'getDiagnostics', // description
    [
      { name: 'projectRoot', type: 'string' },
      { name: 'fullPath', type: 'string' },
      { name: 'code', type: 'string' }
    ], [
      { name: 'report', type: 'object' }
    ]
  );

  domainManager.registerCommand(
    domainName,
    'getCompletions', // command name
    getCompletions, // handler function
    true, // is async
    'getCompletions', // description
    [
      { name: 'projectRoot', type: 'string' },
      { name: 'fullPath', type: 'string' },
      { name: 'code', type: 'string' },
      { name: 'position', type: 'number' }
    ], [
      { name: 'report', type: 'object' }
    ]
  );

};
