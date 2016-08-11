var fs = require('fs');
var ts = require('typescript');
var path = require('path');
var TSLint = require('tslint');
var TypeScriptLanguageServiceHost = require('./dist/node/language-service-host').TypeScriptLanguageServiceHost;

// parse config
var parsed = ts.parseJsonConfigFileContent(
  ts.readConfigFile(path.join(__dirname, 'tsconfig.json'), ts.sys.readFile).config,
  ts.sys,
  __dirname
);

// setup languageServiceHost and languageService
var languageServiceHost = new TypeScriptLanguageServiceHost(__dirname, parsed.options, parsed.fileNames);
var languageService = ts.createLanguageService(languageServiceHost, ts.createDocumentRegistry());

function lintFile(relativePath) {
  console.log('checking', relativePath);

  var filePath = path.resolve(__dirname, relativePath);
  var fileContent = fs.readFileSync(filePath, 'utf8');

  // add the file to the language service host first
  languageServiceHost._addFile(filePath, fileContent);
  var program = languageService.getProgram();

  // check everything is ok with typescript
  var sourceFile = program.getSourceFile(filePath);
  var tsDiagnostics = [].concat(
    program.getDeclarationDiagnostics(sourceFile),
    program.getSemanticDiagnostics(sourceFile),
    program.getSyntacticDiagnostics(sourceFile)
  );
  console.log('tsDiagnostics errors:', tsDiagnostics.length);

  var tsLintConfigPath = TSLint.findConfigurationPath(null, __dirname);
  var tsLintConfig = TSLint.loadConfigurationFromPath(tsLintConfigPath);
  var tsLinter = new TSLint(filePath, fileContent, { configuration: tsLintConfig }, program);
  var result = tsLinter.lint();
  console.log('tsLint errors:', result.failures.length, '\n', result.output, '\n');
}

console.log('');
lintFile('src/node/domain.ts');
lintFile('src/node/language-service-host.ts');
