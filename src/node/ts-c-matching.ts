import * as ts from 'typescript';
import {
  FileSystemEntries, normalizePath, combinePaths, fileExtensionIsAny, getNormalizedPathComponents,
  removeTrailingDirectorySeparator, directorySeparator, isRootedDiskPath, indexOfAnyCharCode, getDirectoryPath,
  compareStrings, compareStringsCaseInsensitive, containsPath, FileMatcherPatterns
} from './ts-c-core';
import { CharacterCodes } from './ts-c-types';

const reservedCharacterPattern = /[^\w\s\/]/g;
const wildcardCharCodes = [CharacterCodes.asterisk, CharacterCodes.question];
const singleAsteriskRegexFragmentFiles = "([^./]|(\\.(?!min\\.js$))?)*";
const singleAsteriskRegexFragmentOther = "[^/]*";

function replaceWildcardCharacter(match: string, singleAsteriskRegexFragment: string) {
  return match === "*" ? singleAsteriskRegexFragment : match === "?" ? "[^/]" : "\\" + match;
}

function replaceWildCardCharacterFiles(match: string) {
  return replaceWildcardCharacter(match, singleAsteriskRegexFragmentFiles);
}

function replaceWildCardCharacterOther(match: string) {
  return replaceWildcardCharacter(match, singleAsteriskRegexFragmentOther);
}

export function getRegularExpressionForWildcard(specs: string[], basePath: string, usage: "files" | "directories" | "exclude") {
  if (specs === undefined || specs.length === 0) {
      return undefined;
  }

  const replaceWildcardCharacter =  usage === "files" ? replaceWildCardCharacterFiles : replaceWildCardCharacterOther;
  const singleAsteriskRegexFragment = usage === "files" ? singleAsteriskRegexFragmentFiles : singleAsteriskRegexFragmentOther;

  /**
   * Regex for the ** wildcard. Matches any number of subdirectories. When used for including
   * files or directories, does not match subdirectories that start with a . character
   */
  const doubleAsteriskRegexFragment = usage === "exclude" ? "(/.+?)?" : "(/[^/.][^/]*)*?";

  let pattern = "";
  let hasWrittenSubpattern = false;
  spec: for (const spec of specs) {
      if (!spec) {
          continue;
      }

      let subpattern = "";
      let hasRecursiveDirectoryWildcard = false;
      let hasWrittenComponent = false;
      const components = getNormalizedPathComponents(spec, basePath);
      if (usage !== "exclude" && components[components.length - 1] === "**") {
          continue spec;
      }

      // getNormalizedPathComponents includes the separator for the root component.
      // We need to remove to create our regex correctly.
      components[0] = removeTrailingDirectorySeparator(components[0]);

      let optionalCount = 0;
      for (let component of components) {
          if (component === "**") {
              if (hasRecursiveDirectoryWildcard) {
                  continue spec;
              }

              subpattern += doubleAsteriskRegexFragment;
              hasRecursiveDirectoryWildcard = true;
              hasWrittenComponent = true;
          }
          else {
              if (usage === "directories") {
                  subpattern += "(";
                  optionalCount++;
              }

              if (hasWrittenComponent) {
                  subpattern += directorySeparator;
              }

              if (usage !== "exclude") {
                  // The * and ? wildcards should not match directories or files that start with . if they
                  // appear first in a component. Dotted directories and files can be included explicitly
                  // like so: **/.*/.*
                  if (component.charCodeAt(0) === CharacterCodes.asterisk) {
                      subpattern += "([^./]" + singleAsteriskRegexFragment + ")?";
                      component = component.substr(1);
                  }
                  else if (component.charCodeAt(0) === CharacterCodes.question) {
                      subpattern += "[^./]";
                      component = component.substr(1);
                  }
              }

              subpattern += component.replace(reservedCharacterPattern, replaceWildcardCharacter);
              hasWrittenComponent = true;
          }
      }

      while (optionalCount > 0) {
          subpattern += ")?";
          optionalCount--;
      }

      if (hasWrittenSubpattern) {
          pattern += "|";
      }

      pattern += "(" + subpattern + ")";
      hasWrittenSubpattern = true;
  }

  if (!pattern) {
      return undefined;
  }

  return "^(" + pattern + (usage === "exclude" ? ")($|/)" : ")$");
}

function getBasePaths(path: string, includes: string[], useCaseSensitiveFileNames: boolean) {
  // Storage for our results in the form of literal paths (e.g. the paths as written by the user).
  const basePaths: string[] = [path];
  if (includes) {
      // Storage for literal base paths amongst the include patterns.
      const includeBasePaths: string[] = [];
      for (const include of includes) {
          // We also need to check the relative paths by converting them to absolute and normalizing
          // in case they escape the base path (e.g "..\somedirectory")
          const absolute: string = isRootedDiskPath(include) ? include : normalizePath(combinePaths(path, include));

          const wildcardOffset = indexOfAnyCharCode(absolute, wildcardCharCodes);
          const includeBasePath = wildcardOffset < 0
              ? removeTrailingDirectorySeparator(getDirectoryPath(absolute))
              : absolute.substring(0, absolute.lastIndexOf(directorySeparator, wildcardOffset));

          // Append the literal and canonical candidate base paths.
          includeBasePaths.push(includeBasePath);
      }

      // Sort the offsets array using either the literal or canonical path representations.
      includeBasePaths.sort(useCaseSensitiveFileNames ? compareStrings : compareStringsCaseInsensitive);

      // Iterate over each include base path and include unique base paths that are not a
      // subpath of an existing base path
      include: for (let i = 0; i < includeBasePaths.length; i++) {
          const includeBasePath = includeBasePaths[i];
          for (let j = 0; j < basePaths.length; j++) {
              if (containsPath(basePaths[j], includeBasePath, path, !useCaseSensitiveFileNames)) {
                  continue include;
              }
          }

          basePaths.push(includeBasePath);
      }
  }

  return basePaths;
}

export function getFileMatcherPatterns(
  path: string, extensions: string[], excludes: string[], includes: string[], useCaseSensitiveFileNames: boolean, currentDirectory: string
): FileMatcherPatterns {
  path = normalizePath(path);
  currentDirectory = normalizePath(currentDirectory);
  const absolutePath = combinePaths(currentDirectory, path);

  return {
    includeFilePattern: getRegularExpressionForWildcard(includes, absolutePath, "files"),
    includeDirectoryPattern: getRegularExpressionForWildcard(includes, absolutePath, "directories"),
    excludePattern: getRegularExpressionForWildcard(excludes, absolutePath, "exclude"),
    basePaths: getBasePaths(path, includes, useCaseSensitiveFileNames)
  };
}

export function matchFiles(
  path: string, extensions: string[], excludes: string[], includes: string[], useCaseSensitiveFileNames: boolean,
  currentDirectory: string, getFileSystemEntries: (path: string) => FileSystemEntries
): string[] {
  path = normalizePath(path);
  currentDirectory = normalizePath(currentDirectory);

  const patterns = getFileMatcherPatterns(path, extensions, excludes, includes, useCaseSensitiveFileNames, currentDirectory);

  const regexFlag = useCaseSensitiveFileNames ? "" : "i";
  const includeFileRegex = patterns.includeFilePattern && new RegExp(patterns.includeFilePattern, regexFlag);
  const includeDirectoryRegex = patterns.includeDirectoryPattern && new RegExp(patterns.includeDirectoryPattern, regexFlag);
  const excludeRegex = patterns.excludePattern && new RegExp(patterns.excludePattern, regexFlag);

  const result: string[] = [];
  for (const basePath of patterns.basePaths) {
    visitDirectory(basePath, combinePaths(currentDirectory, basePath));
  }
  return result;

  function visitDirectory(path: string, absolutePath: string) {
    const { files, directories } = getFileSystemEntries(path);

    for (const current of files) {
      const name = combinePaths(path, current);
      const absoluteName = combinePaths(absolutePath, current);
      if ((!extensions || fileExtensionIsAny(name, extensions)) &&
          (!includeFileRegex || includeFileRegex.test(absoluteName)) &&
          (!excludeRegex || !excludeRegex.test(absoluteName))) {
          result.push(name);
      }
    }

    for (const current of directories) {
      const name = combinePaths(path, current);
      const absoluteName = combinePaths(absolutePath, current);
      if ((!includeDirectoryRegex || includeDirectoryRegex.test(absoluteName)) &&
          (!excludeRegex || !excludeRegex.test(absoluteName))) {
          visitDirectory(name, absoluteName);
      }
    }
  }
}
