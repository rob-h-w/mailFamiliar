import * as env from 'env-var';

import Synchronizer from './engine/synchronizer';
import {IInitializablePersistence} from './persistence/persistence';
import Json from './persistence/json';

function canFixByReconnecting(reason: any): boolean {
  if (!reason) {
    return false;
  }

  if (reason.source) {
    switch (reason.source) {
      case 'timeout-auth':
      case 'socket-timeout':
      case 'timeout':
        return true;
    }
  }

  if (reason.message) {
    switch (reason.message) {
      case 'Not authenticated':
        return true;
    }
  }

  return false;
}

class Glue {
  readonly persistence: IInitializablePersistence<string>;
  readonly synchronizer: Synchronizer;

  constructor() {
    this.persistence = new Json();
    this.synchronizer = new Synchronizer(this.persistence);
  }

  async init() {
    await this.persistence.init(
      env
        .get('M_FAMILIAR_STORAGE')
        .required()
        .asString()
    );
    await this.synchronizer.init();
  }

  handleError(reason: Error): boolean {
    if (canFixByReconnecting(reason)) {
      setTimeout(() => this.synchronizer.reconnect(), 10_000);
      return true;
    }

    return false;
  }
}

export default new Glue();
