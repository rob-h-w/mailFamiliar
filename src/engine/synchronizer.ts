import IPersistence from '../persistence/persistence';
import User from 'persistence/user';
import UserConnection from './userConnection';

export default class Synchronizer {
  private readonly persistence: IPersistence;

  constructor(persistence: IPersistence) {
    this.persistence = persistence;
  }

  public init = async () => {
    const users: ReadonlyArray<User> = await this.persistence.listUsers();

    for (const user of users) {
      await this.initUserConnection(user);
    }
  };

  private initUserConnection = async (user: User, connectionAttempts: number = 0) => {
    const userConnection = await UserConnection.create(user, this.persistence, connectionAttempts);
    userConnection.onDisconnect = () => {
      const timeout =
        1000 *
        user.reconnect.timeoutSeconds *
        (1 +
          user.reconnect.multiplier *
            Math.min(userConnection.connectionAttempts, user.reconnect.backoffs));

      setTimeout(this.initUserConnection, timeout, user, userConnection.connectionAttempts + 1);
    };
    await UserConnection.refresh(userConnection);
  };
}
