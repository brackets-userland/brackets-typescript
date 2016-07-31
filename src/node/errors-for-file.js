// from https://github.com/TypeStrong/atom-typescript/blob/8d43dd1b930a6df0ce62454a1560acfb7eee24c9/lib/main/lang/projectService.ts#L394

export function errorsForFile(query: FilePathQuery): Promise<{
    errors: CodeError[]
}> {
    consistentPath(query);
    let project: project.Project;

    try {
        project = getOrCreateProject(query.filePath);
    } catch (ex) {
        return resolve({ errors: [] });
    }

    // for file path errors in transformer
    if (isTransformerFile(query.filePath)) {
        let filePath = transformer.getPseudoFilePath(query.filePath);
        let errors = getDiagnositcsByFilePath({ filePath }).map(building.diagnosticToTSError);
        errors.forEach(error => {
            error.filePath = query.filePath;
        });
        return resolve({ errors: errors });
    }
    else {
        let result: CodeError[];

        if (project.includesSourceFile(query.filePath)) {
            result = getDiagnositcsByFilePath(query).map(building.diagnosticToTSError);
        } else {
            result = notInContextResult(query.filePath);
        }

        return resolve({ errors: result });
    }
}
