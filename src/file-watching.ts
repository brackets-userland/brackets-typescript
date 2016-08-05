define(function (require, exports, module) {
  'use strict';

  const FileSystem = brackets.getModule("filesystem/FileSystem")
  const nodeDomain = require('./node-domain');

  function handleFileSystemChange(evt, file) {
    if (file == null) { return; }
    const notification: FileChangeNotification = {
      type: evt.type,
      fullPath: file.fullPath,
      isFile: file.isFile,
      isDirectory: file.isDirectory
    };
    nodeDomain.exec('fileChange', notification);
  }

  module.exports = function () {
    FileSystem.on('change', handleFileSystemChange);
  };

});
