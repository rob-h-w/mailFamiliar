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
      const modes: Map<number, number> = new Map();
      let minimum = 1;

      for (const encounteredHeader of headersList) {
        const score = crossCorrelateStrings(Array.from(encounteredHeader), Array.from(headers));
        const mode = modes.get(score);
        modes.set(score, mode === undefined ? 1 : mode + 1);
        minimum = Math.min(minimum, score);
      }

      let mode = 1;
      let max = 0;
      modes.forEach((value, key) => {
        if (value > max) {
          mode = key;
          max = value;
        }
      });

      result.set(qualifiedName, 1 - mode);
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
