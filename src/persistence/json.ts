import * as fs from 'fs';
import * as path from 'path';

import Persistence from "./persistence";
import User from './user';
import Box from './box';

export default class Json implements Persistence {
  private contentsFolder: string;

  async init(contentsFolder: string) {
    this.contentsFolder = contentsFolder;
  }

  async createUser(user: User) {}
  async listUsers(): Promise<Array<User> > {
    return new Promise<Array<User> >((resolve, reject) => {
      fs.readdir(this.contentsFolder, (err, files) => {
        if (err) {
          return reject(err);
        }

        const users: Array<User> = [];

        files.forEach((file) => {
          users.push(<User><unknown> JSON.parse(fs.readFileSync(path.join(this.contentsFolder, file)).toString()));
        });

        resolve(users);
      });
    });
  }

  async createBox(user: User, box: Box) {}
  async listBoxes(user: User): Promise<Array<Box> > {
    return [];
  }
};
