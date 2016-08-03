declare var define: any;
declare var brackets: any;

interface FileChangeNotification {
  type: string;
  fullPath: string;
  isFile: boolean;
  isDirectory: boolean;
}
