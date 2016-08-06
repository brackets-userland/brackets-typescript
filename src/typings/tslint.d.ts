interface IConfigurationFile {
    extends?: string | string[];
    linterOptions?: {
        typeCheck?: boolean,
    };
    rulesDirectory?: string | string[];
    rules?: any;
}
