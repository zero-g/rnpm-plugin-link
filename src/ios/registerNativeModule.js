const xcode = require('xcode');
const fs = require('fs');
const path = require('path');

const addToHeaderSearchPaths = require('./addToHeaderSearchPaths');
const getHeadersInFolder = require('./getHeadersInFolder');
const getHeaderSearchPath = require('./getHeaderSearchPath');
const getProducts = require('./getProducts');
const hasLibraryImported = require('./hasLibraryImported');
const addFileToProject = require('./addFileToProject');
const isEmpty = require('../isEmpty');

/**
 * Given an array of xcodeproj libraries and pbxFile,
 * it appends it to that group
 */
const addProjectToLibraries = (libraries, file) => {
  return libraries.children.push({
    value: file.fileRef,
    comment: file.basename,
  });
};

/**
 * Register native module IOS adds given dependency to project by adding
 * its xcodeproj to project libraries as well as attaching static library
 * to the first target (the main one)
 *
 * If library is already linked, this action is a no-op.
 */
module.exports = function registerNativeModuleIOS(dependencyConfig, projectConfig) {
  const project = xcode.project(projectConfig.pbxprojPath).parseSync();
  const dependencyProject = xcode.project(dependencyConfig.pbxprojPath).parseSync();

  const libraries = project.pbxGroupByName(projectConfig.libraryFolder);
  if (hasLibraryImported(libraries, dependencyConfig.projectName)) {
    return;
  }

  const file = addFileToProject(
    project,
    path.relative(projectConfig.sourceDir, dependencyConfig.projectPath)
  );

  addProjectToLibraries(libraries, file);

  getProducts(dependencyProject).forEach(product => {
    project.addStaticLibrary(product, {
      target: project.getFirstTarget().uuid,
    });
  });

  const headers = getHeadersInFolder(dependencyConfig.folder);
  if (!isEmpty(headers)) {
    addToHeaderSearchPaths(
      project,
      getHeaderSearchPath(projectConfig.sourceDir, headers)
    );
  }

  fs.writeFileSync(
    projectConfig.pbxprojPath,
    project.writeSync()
  );
};
