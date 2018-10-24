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
    this.users.forEach((user) => {
      this.imaps.push(new Imap(user));
    });
  }
};
