export class BadJsonException extends SyntaxError {
  constructor(filename: string, parent: SyntaxError) {
    super(`Coulld not parse ${filename}. ${parent.message}`);
  }
}
