import PersistenceModel from '../persistence/model';
import Persistence from '../persistence/persistence';
import Mistake from '../types/mistake';
import Box from './box';
import Predictor, {UndeclaredBoxError} from './predictor';
import ThresholdedDiffAndAtables from './thresholdedDiffAndAtables';

class TraatPersistenceModel implements PersistenceModel {
  private persistence: Persistence | undefined;
  private predictor: ThresholdedRegexAndAtable;

  constructor(predictor: ThresholdedRegexAndAtable) {
    this.predictor = predictor;
  }

  persist(persistence: Persistence): Promise<void> {
    this.persistence = persistence;
    throw new Error('Method not implemented.');
  }

  restore(persistence: Persistence): Promise<void> {
    this.persistence = persistence;
    throw new Error('Method not implemented.');
  }
}

export default class ThresholdedRegexAndAtable implements Predictor {
  private boxMap: Map<string, ThresholdedDiffAndAtables> = new Map();
  private mistakenBoxMap: Map<string, ThresholdedDiffAndAtables> = new Map();
  private traatPersistenceModel: TraatPersistenceModel = new TraatPersistenceModel(this);

  addHeaders(headers: string, qualifiedBoxName: string): void {
    this.getBoxDiff(qualifiedBoxName).addStrings([headers]);

    const tdaat: ThresholdedDiffAndAtables | undefined = this.mistakenBoxMap.get(qualifiedBoxName);
    if (tdaat) {
      tdaat.removeStrings([headers]);
    }
  }

  addMistake(mistake: Mistake): void {
    const errantDestination = mistake.errantMove.destination;
    if (!this.mistakenBoxMap.get(errantDestination)) {
      this.mistakenBoxMap.set(
        errantDestination,
        new ThresholdedDiffAndAtables([mistake.errantMove.message.headers])
      );
    } else {
      this.mistakenBoxMap.get(errantDestination)?.addStrings([mistake.errantMove.message.headers]);
    }
  }

  private getBoxDiff(qualifiedBoxName: string): ThresholdedDiffAndAtables {
    const diff = this.boxMap.get(qualifiedBoxName);
    if (!diff) {
      throw new UndeclaredBoxError(qualifiedBoxName);
    }
    return diff;
  }

  considerBox(box: Box): void {
    this.boxMap = this.boxMap.set(
      box.qualifiedName,
      new ThresholdedDiffAndAtables(box.messages.map(messages => messages.headers as string))
    );
  }

  folderScore(headers: string): Map<string, number> {
    const result = new Map();
    this.boxMap.forEach((tdaat, qualifiedName) =>
      result.set(
        qualifiedName,
        tdaat.confidenceFor(headers) - this.mistakeScore(qualifiedName, headers)
      )
    );
    return result;
  }

  private mistakeScore(qualifiedName: string, headers: string): number {
    const tdaat: ThresholdedDiffAndAtables | undefined = this.mistakenBoxMap.get(qualifiedName);
    if (tdaat) {
      return tdaat.confidenceFor(headers);
    }

    return 0;
  }

  persistenceModel(): PersistenceModel {
    return this.traatPersistenceModel;
  }

  name(): string {
    return 'thresholded regex';
  }

  removeHeaders(headers: string, qualifiedBoxName: string): void {
    this.getBoxDiff(qualifiedBoxName).removeStrings([headers]);
  }
}
