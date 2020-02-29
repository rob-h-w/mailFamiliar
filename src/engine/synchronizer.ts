import _ = require('lodash');

import Persistence from '../persistence/persistence';
import User from 'persistence/user';
import UserConnection from './userConnection';

export default class Synchronizer {
  private connections: UserConnection[];
  private readonly persistence: Persistence;

  constructor(persistence: Persistence) {
    this.connections = [];
    this.persistence = persistence;
  }

  public init = async (): Promise<void> => {
    if (!_.isEmpty(this.connections)) {
      throw new Error('Cannot init until prior connections are extinguished.');
    }

    const users: ReadonlyArray<User> = await this.persistence.listUsers();

    for (const user of users) {
      await this.initUserConnection(user);
    }
  };

  private initUserConnection = async (
    user: User,
    connectionAttempts = 0
  ): Promise<UserConnection> => {
    const userConnection = new UserConnection(this.persistence, user, connectionAttempts);
    userConnection.onDisconnect = (): void => {
      const timeout =
        1000 *
        user.reconnect.timeoutSeconds *
        (1 +
          user.reconnect.multiplier *
            Math.min(userConnection.connectionAttempts, user.reconnect.backoffs));

      setTimeout(this.initUserConnection, timeout, user, userConnection.connectionAttempts + 1);
    };
    await userConnection.init();
    return userConnection;
  };

  public reconnect = async (): Promise<void> => {
    for (const connection of this.connections) {
      await connection.disconnect();
    }

    this.connections = [];

    await this.init();
  };
}
