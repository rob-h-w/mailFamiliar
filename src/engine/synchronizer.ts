import Imap from '../imap/imap';
import UserConnection from '../imap/userConnection';
import IPersistence from '../persistence/persistence';
import User from '../persistence/user';

export default class Synchronizer {
  private readonly persistence: IPersistence;
  private readonly userConnections: UserConnection[];

  constructor(persistence: IPersistence) {
    this.persistence = persistence;
    this.userConnections = [];
  }

  public async init() {
    const users: User[] = await this.persistence.listUsers();

    for (const user of users) {
      const imap: Imap = new Imap(user);
      await imap.init();
      this.userConnections.push(await UserConnection.create(imap, this.persistence));
    }
  }
}
