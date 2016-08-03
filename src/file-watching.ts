define(function (require, exports, module) {
  'use strict';

  const FileSystem = brackets.getModule("filesystem/FileSystem")
  const nodeDomain = require('./node-domain');

  module.exports = function () {
    FileSystem.on('change', function (evt, file) {
      const notification: FileChangeNotification = {
        type: evt.type,
        fullPath: file.fullPath,
        isFile: file.isFile,
        isDirectory: file.isDirectory
      };
      nodeDomain.exec('fileChange', notification);
    });
  };

});
