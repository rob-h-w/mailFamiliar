import * as env from 'env-var';

import Synchronizer from './engine/synchronizer';
import {MissingDisconnectionCallback} from './persistence/exceptions';
import {InitializablePersistence} from './persistence/persistence';
import Json from './persistence/json';

function canFixByReconnecting(reason: any): boolean {
  if (!reason) {
    return false;
  }

  if (reason instanceof MissingDisconnectionCallback) {
    return true;
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
  readonly persistence: InitializablePersistence<string>;
  readonly synchronizer: Synchronizer;

  private connectionTimer?: NodeJS.Timeout;

  constructor() {
    this.persistence = new Json(this.path());
    this.synchronizer = new Synchronizer(this.persistence);
  }

  async init() {
    await this.persistence.init(this.path());
    await this.synchronizer.init();
  }

  handleError(reason: Error): boolean {
    if (canFixByReconnecting(reason) && !this.connectionTimer) {
      this.connectionTimer = setTimeout(() => {
        this.connectionTimer = undefined;
        this.synchronizer.reconnect();
      }, 10_000);
      return true;
    }

    return false;
  }

  private path(): string {
    return env.get('M_FAMILIAR_STORAGE').required().asString();
  }
}

export default new Glue();
