'use strict';

var PackageJson = require('../../package.json');
var EXTENSION_NAME = PackageJson.name;

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
