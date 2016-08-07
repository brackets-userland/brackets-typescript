declare var define: any;
declare var brackets: any;

interface CodeInspectionPosition {
  line: number;
  ch: number;
}

interface CodeInspectionError {
  type: string;
  message: string;
  pos: CodeInspectionPosition;
}

interface FileChangeNotification {
  type: string;
  fullPath: string;
  isFile: boolean;
  isDirectory: boolean;
}
