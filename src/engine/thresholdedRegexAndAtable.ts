import Persistence from '../persistence/persistence';
import User from '../persistence/user';
import Mistake from '../types/mistake';
import Box from './box';
import Predictor, {UndeclaredBoxError} from './predictor';
import ThresholdedDiffAndAtables from './thresholdedDiffAndAtables';

type TdaatMap = Map<string, ThresholdedDiffAndAtables>;

export default class ThresholdedRegexAndAtable implements Predictor {
  #boxNames?: ReadonlyArray<string>;
  readonly #boxMap: TdaatMap = new Map();
  readonly #mistakenBoxMap: TdaatMap = new Map();
  #predictorId?: string;
  #persistence?: Persistence;
  #user?: User;

  async init(user: User, persistence: Persistence): Promise<void> {
    this.#persistence = persistence;
    this.#user = user;
    this.#predictorId = await persistence.getPredictorId(user, this.name);

    for (const box of await persistence.listBoxes(user)) {
      const tdaatId = await persistence.getPrimitiveId(this.#predictorId);
      const tdaat = new ThresholdedDiffAndAtables(user, persistence, box, this.#predictorId);
      await tdaat.init();
      this.#boxMap.set(box.qualifiedName, tdaat);
    }

    console.log(this.#boxNames);
  }

  async addHeaders(headers: string, qualifiedBoxName: string): Promise<void> {
    this.getBoxTdaat(qualifiedBoxName).addStrings([headers]);

    const tdaat: ThresholdedDiffAndAtables | undefined = this.#mistakenBoxMap.get(qualifiedBoxName);
    if (tdaat) {
      tdaat.removeStrings([headers]);
    }
  }

  async addMistake(mistake: Mistake): Promise<void> {
    const errantDestination = mistake.errantMove.destination;
    if (!this.#mistakenBoxMap.get(errantDestination)) {
      this.#mistakenBoxMap.set(
        errantDestination,
        new ThresholdedDiffAndAtables([mistake.errantMove.message.headers])
      );
    } else {
      this.#mistakenBoxMap.get(errantDestination)?.addStrings([mistake.errantMove.message.headers]);
    }
  }

  async considerBox(box: Box): Promise<void> {
    this.#boxMap.set(
      box.qualifiedName,
      new ThresholdedDiffAndAtables(box.messages.map(messages => messages.headers as string))
    );
  }

  async folderScore(headers: string): Promise<Map<string, number>> {
    const result = new Map();
    this.#boxMap.forEach((tdaat, qualifiedName) =>
      result.set(
        qualifiedName,
        tdaat.confidenceFor(headers) - this.mistakeScore(qualifiedName, headers)
      )
    );
    return result;
  }

  private getBoxTdaat(qualifiedBoxName: string): ThresholdedDiffAndAtables {
    const tdaat = this.#boxMap.get(qualifiedBoxName);
    if (!tdaat) {
      throw new UndeclaredBoxError(qualifiedBoxName);
    }
    return tdaat;
  }

  private mistakeScore(qualifiedName: string, headers: string): number {
    const tdaat: ThresholdedDiffAndAtables | undefined = this.#mistakenBoxMap.get(qualifiedName);
    if (tdaat) {
      return tdaat.confidenceFor(headers);
    }

    return 0;
  }

  name(): string {
    return 'thresholded regex';
  }

  persistenceModel(): PersistenceModel {
    return this.#traatPersistenceModel;
  }

  async removeBox(qualifiedBoxName: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async removeHeaders(headers: string, qualifiedBoxName: string): Promise<void> {
    this.getBoxTdaat(qualifiedBoxName).removeStrings([headers]);
  }
}
