import Box from './box';

export class BadStateException extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class BoxDeletedException extends Error {
  public readonly deleted: Box;

  constructor(deleted: Box) {
    super('Box was deleted');
    this.deleted = deleted;
  }

  public static checkAndThrow(box: Box, e: Error): never {
    if (
      e.name === 'Error' &&
      e.message &&
      e.message.toString().startsWith("Mailbox doesn't exist: ")
    ) {
      throw new BoxDeletedException(box);
    }
    throw e;
  }
}

export class ImapBoxMissingException extends Error {
  public readonly missingImapBox: Box;

  constructor(missing: Box) {
    super('Imap box is missing');
    this.missingImapBox = missing;
  }
}
