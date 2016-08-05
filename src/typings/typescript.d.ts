interface CompletionEntry {
  name: string;
  kind: string;
  kindModifiers: string;
  sortText: string;
}

interface CompletionInfo {
  isMemberCompletion: boolean;
  isNewIdentifierLocation: boolean;
  entries: CompletionEntry[];
}

interface FileMatcherPatterns {
  includeFilePattern: string;
  includeDirectoryPattern: string;
  excludePattern: string;
  basePaths: string[];
}
