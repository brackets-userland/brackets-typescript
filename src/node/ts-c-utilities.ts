import * as ts from 'typescript';

const carriageReturnLineFeed = "\r\n";
const lineFeed = "\n";

export function isWatchSet(options: ts.CompilerOptions) {
  const o = (<any> options);
  // Firefox has Object.prototype.watch
  return o.watch && o.hasOwnProperty("watch");
}

export function getNewLineCharacter(sys: ts.System, options: ts.CompilerOptions): string {
  if (options.newLine === ts.NewLineKind.CarriageReturnLineFeed) {
    return carriageReturnLineFeed;
  }
  else if (options.newLine === ts.NewLineKind.LineFeed) {
    return lineFeed;
  }
  else if (sys) {
    return sys.newLine;
  }
  return carriageReturnLineFeed;
}
