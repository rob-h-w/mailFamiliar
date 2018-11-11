import Box from '../imap/box';
import Imap from '../imap/imap';
import IPersistence from '../persistence/persistence';
import User from '../persistence/user';
import UserConnection from '../imap/userConnection';

export default class Synchronizer {
  private readonly persistence: IPersistence;
  private readonly userConnections: Array<UserConnection>;

  constructor (persistence: IPersistence) {
    this.persistence = persistence;
    this.userConnections = [];
  }

  public async init() {
    const users: Array<User> = await this.persistence.listUsers();

    for (let i = 0; i < users.length; i++) {
      const user: User = users[i];
      const imap: Imap = new Imap(user);
      await imap.init();
      this.userConnections.push(await UserConnection.create(imap, this.persistence));
    }
  }
};
