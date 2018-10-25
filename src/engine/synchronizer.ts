import Imap from '../imap/imap';
import Persistence from '../persistence/persistence';
import User from '../persistence/user';
import UserConnection from './userConnection';

export default class Synchronizer {
  private readonly persistence: Persistence;
  private readonly userConnections: Array<UserConnection>;

  constructor (persistence: Persistence) {
    this.persistence = persistence;
    this.userConnections = [];
  }

  public async init() {
    const users: Array<User> = await this.persistence.listUsers();

    for (let i = 0; i < users.length; i++) {
      const user: User = users[i];
      const imap = new Imap(user);
      await imap.init();
      const persistedBoxes = await this.persistence.listBoxes(user);
      this.userConnections.push(new UserConnection(imap, persistedBoxes));
    }
  }
};
