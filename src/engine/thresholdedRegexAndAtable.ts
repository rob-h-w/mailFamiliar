import {Map} from 'immutable';

import Box from './box';
import {canMoveTo} from '../imap/boxFeatures';
import IPredictor, {UndeclaredBoxError} from './predictor';
import ThresholdedDiffAndAtables from './thresholdedDiffAndAtables';

export default class ThresholdedRegexAndAtable implements IPredictor {
  private boxMap: Map<string, ThresholdedDiffAndAtables> = Map.of();

  addHeaders = (headers: string, qualifiedBoxName: string): void =>
    this.getBoxDiff(qualifiedBoxName).addStrings([headers]);

  private getBoxDiff(qualifiedBoxName: string): ThresholdedDiffAndAtables {
    const diff = this.boxMap.get(qualifiedBoxName);
    if (!diff) {
      throw new UndeclaredBoxError(qualifiedBoxName);
    }
    return diff;
  }

  considerBox = (box: Box): void => {
    this.boxMap = this.boxMap.set(
      box.qualifiedName,
      new ThresholdedDiffAndAtables(box.messages.map(messages => messages.headers as string))
    );
  };

  folderScore = (headers: string): Map<string, number> => {
    return this.boxMap
      .filter((_, qualifiedBoxName) => canMoveTo(qualifiedBoxName))
      .map(tdaat => tdaat.confidenceFor(headers));
  };

  name = (): string => 'thresholded regex';

  removeHeaders = (headers: string, qualifiedBoxName: string): void =>
    this.getBoxDiff(qualifiedBoxName).removeStrings([headers]);
}
