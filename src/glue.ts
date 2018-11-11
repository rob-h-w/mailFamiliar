import * as env from 'env-var';

import Synchronizer from './engine/synchronizer';
import IPersistence from './persistence/persistence';
import Json from './persistence/json';

class Glue {
  readonly persistence: IPersistence;
  readonly synchronizer: Synchronizer;

  constructor() {
    this.persistence = new Json();
    this.synchronizer = new Synchronizer(this.persistence);
  };

  async init() {
    await this.persistence.init(env.get('M_FAMILIAR_STORAGE').required().asString());
    await this.synchronizer.init();
  }
}

export default new Glue();
