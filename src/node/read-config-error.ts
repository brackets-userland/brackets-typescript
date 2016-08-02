export default class ReadConfigError extends Error {
  code: string;
  messageText: string;
  constructor(code: string, messageText: string) {
    super(messageText);
    this.name = 'ReadConfigError';
    this.code = code;
    this.messageText = messageText;
  }
}
