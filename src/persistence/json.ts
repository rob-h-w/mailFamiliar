import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import Box, {IBoxPersisted} from '../engine/box';
import {IInitializablePersistence} from './persistence';
import User from './user';

function hashOf(value: string): string {
  return crypto
    .createHash('sha256')
    .update(value)
    .digest()
    .toString('hex');
}

function stringify<T extends {}>(object: T): string {
  return JSON.stringify(object, null, 2);
}

export default class Json implements IInitializablePersistence<string> {
  private contentsFolder: string;

  public userDataRoot(user: User): string {
    return path.join(this.contentsFolder, hashOf(user.user));
  }

  async init(contentsFolder: string) {
    this.contentsFolder = contentsFolder;
  }

  private boxName(box: Box): string {
    return hashOf(box.qualifiedName);
  }

  private boxPath(user: User, box: Box): string {
    return path.join(this.userDataRoot(user), `${this.boxName(box)}.json`);
  }

  async createUser() {}
  async listUsers(): Promise<Array<User>> {
    return new Promise<Array<User>>((resolve, reject) => {
      fs.readdir(this.contentsFolder, (err, files) => {
        if (err) {
          return reject(err);
        }

        const users: Array<User> = [];

        files.forEach(file => {
          const userPath = path.join(this.contentsFolder, file);
          if (fs.statSync(userPath).isFile()) {
            users.push(JSON.parse(fs.readFileSync(userPath).toString()));
          }
        });

        resolve(users);
      });
    });
  }

  async createBox(user: User, box: Box) {
    const folder = this.userDataRoot(user);
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }
    await this.updateBox(user, box);
  }

  async deleteBox(user: User, box: Box) {
    return new Promise<void>((resolve, reject) => {
      fs.unlink(this.boxPath(user, box), err => {
        if (err) {
          if (err.code && err.code === 'ENOENT') {
            return resolve();
          }

          return reject(err);
        }

        resolve();
      });
    });
  }

  async listBoxes(user: User): Promise<Array<Box>> {
    return new Promise<Array<Box>>((resolve, reject) => {
      const userDataRoot: string = this.userDataRoot(user);
      fs.readdir(userDataRoot, (err, files) => {
        if (err) {
          if (err.code && err.code === 'ENOENT') {
            return resolve([]);
          }

          return reject(err);
        }

        const boxen: Array<Box> = [];

        files.forEach(file => {
          const box = JSON.parse(fs.readFileSync(path.join(userDataRoot, file)).toString());
          box.messages.forEach((message: any) => {
            message.envelope.date = new Date(Date.parse(message.envelope.date));
          });
          boxen.push(new Box(box as IBoxPersisted));
        });

        resolve(boxen);
      });
    });
  }

  updateBox = async (user: User, box: Box): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const boxPersisted: IBoxPersisted = {
        messages: box.messages,
        name: box.name,
        qualifiedName: box.qualifiedName,
        syncedTo: box.syncedTo
      };

      fs.writeFile(this.boxPath(user, box), stringify(boxPersisted), {flag: 'w'}, err => {
        if (err) {
          return reject(err);
        }

        resolve();
      });
    });
  };
}
