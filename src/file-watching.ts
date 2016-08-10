define(function (require, exports, module) {
  'use strict';

  const FileSystem = brackets.getModule('filesystem/FileSystem');
  const ProjectManager = brackets.getModule('project/ProjectManager');
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

  function handleProjectOpen(evt, projectRoot) {
    nodeDomain.exec('projectRefresh', projectRoot.fullPath);
  }

  function handleProjectClose(evt, projectRoot) {
    nodeDomain.exec('projectClose', projectRoot.fullPath);
  }

  module.exports = function () {
    FileSystem.on('change', handleFileSystemChange);
    ProjectManager.on('projectOpen', handleProjectOpen);
    ProjectManager.on('projectRefresh', handleProjectOpen);
    ProjectManager.on('projectClose', handleProjectClose);
  };

});
