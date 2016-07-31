/* eslint strict:[2,'global'] */
'use strict';

/** we work with "/" for all paths (so does the typescript language service) */
exports.consistentPath = function consistentPath(filePath) {
  return filePath.split('\\').join('/');
};
