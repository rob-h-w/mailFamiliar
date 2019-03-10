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
      const userConnection = await UserConnection.create(user, this.persistence);
      await UserConnection.refresh(userConnection);
    }
  };
}
