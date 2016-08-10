'use strict';

if (!global.Promise) {
  require('any-promise/register/bluebird');
}

import { getCompletions } from './ts-completions';
import { getDiagnostics } from './ts-diagnostics';
import { onFileChange, onProjectRefresh, onProjectClose } from './ts-utils';

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
    onFileChange, // handler function
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
    'projectRefresh', // command name
    onProjectRefresh, // handler function
    false, // is not async
    'projectRefresh', // description
    [
      { name: 'projectRoot', type: 'string' }
    ], [
      { name: 'processed', type: 'boolean' }
    ]
  );

  domainManager.registerCommand(
    domainName,
    'projectClose', // command name
    onProjectClose, // handler function
    false, // is not async
    'projectClose', // description
    [
      { name: 'projectRoot', type: 'string' }
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
