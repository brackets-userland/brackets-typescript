'use strict';

var PackageJson = require('../../package.json');
var EXTENSION_NAME = PackageJson.name;

function doLog(level: string, msgs: Array<string>): void {
  console[level].apply(console, ['[' + EXTENSION_NAME + ']'].concat(msgs));
}

export function info(...messages: Array<string>): void {
  doLog('log', messages);
};

export function error(...messages: Array<string>): void {
  doLog('error', messages);
};
