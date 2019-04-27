import Box from './box';
import IPredictor from './predictor';
import {crossCorrelateStrings} from '../tools/crossCorrelate';

export default class CrossCorrelate implements IPredictor {
  private readonly boxToHeaders: Map<string, Array<string>>;

  constructor() {
    this.boxToHeaders = new Map();
  }

  addHeaders(headers: string, qualifiedBoxName: string): void {
    const headersList = this.getHeaders(qualifiedBoxName);
    headersList.push(headers);
    this.boxToHeaders.set(qualifiedBoxName, headersList);
  }

  considerBox(box: Box): void {
    for (const message of box.messages) {
      this.addHeaders(message.headers, box.qualifiedName);
    }
  }

  folderScore(headers: string): Map<string, number> {
    const result = new Map<string, number>();

    for (const [qualifiedName, headersList] of this.boxToHeaders.entries()) {
      let minimum = 1;

      for (const encounteredHeader of headersList) {
        minimum = Math.min(
          minimum,
          crossCorrelateStrings(Array.from(encounteredHeader), Array.from(headers))
        );
      }

      result.set(qualifiedName, 1 - minimum);
    }

    return result;
  }

  private getHeaders(qualifiedName: string): Array<string> {
    return this.boxToHeaders.get(qualifiedName) || [];
  }

  name(): string {
    return 'cross correlate';
  }

  removeHeaders(headers: string, qualifiedBoxName: string): void {
    const headersList = this.getHeaders(qualifiedBoxName);
    const index = headersList.indexOf(headers);

    if (index === -1) {
      return;
    }

    headersList.splice(index, 1);
    this.boxToHeaders.set(qualifiedBoxName, headersList);
  }
}
