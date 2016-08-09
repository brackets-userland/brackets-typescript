export default class ReadConfigError extends Error {
  code: string;
  messageText: string;
  constructor(code: string|number, messageText: any) {
    super(messageText);
    this.name = 'ReadConfigError';
    this.code = code.toString();
    this.messageText = messageText;
  }
}
