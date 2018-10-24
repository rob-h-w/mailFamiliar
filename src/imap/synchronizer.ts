import Imap from './imap';
import Persistence from '../persistence/persistence';
import User from '../persistence/user';

export default class Synchronizer {
  private imaps: Array<Imap>;
  private persistence: Persistence;
  private users: Array<User>;

  constructor (persistence: Persistence) {
    this.persistence = persistence;
  }

  public async init() {
    this.users = await this.persistence.listUsers();

    this.imaps = [];

    for (let i = 0; i < this.users.length; i++) {
      const user: User = this.users[i];
      const imap = new Imap(user);
      await imap.init();
      this.imaps.push(imap);
    }
  }
};
