export class BadJsonException extends SyntaxError {
  constructor(filename: string, parent: SyntaxError) {
    super(`Could not parse ${filename}. ${parent.message}`);
  }
}

export class MissingDisconnectionCallback extends Error {}
