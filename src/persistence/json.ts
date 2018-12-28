import * as crypto from 'crypto';
import * as fs from 'fs';
import * as _ from 'lodash';
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

function indent(depth: number, value: string): string {
  let result = '';

  for (let i = 0; i < depth; i++) {
    result += '  ';
  }

  return `${result}${value}`;
}

function skipMember(member: any) {
  return _.isUndefined(member) || _.isFunction(member);
}

function stringify(value: any, depth: number = 0): string {
  if (_.isNull(value)) {
    return 'null';
  }

  if (_.isString(value)) {
    return JSON.stringify(value);
  }

  if (_.isNumber(value)) {
    return String(value);
  }

  if (_.isDate(value)) {
    return JSON.stringify(value);
  }

  if (_.isArray(value)) {
    if (_.isEmpty(value)) {
      return '[]';
    }

    let separator = '';
    let result = '[\n';

    for (const member of value) {
      if (skipMember(member)) {
        continue;
      }

      result += `${separator}${indent(depth + 1, stringify(member, depth + 1))}`;
      separator = ',\n';
    }

    return `${result}\n${indent(depth, ']')}`;
  }

  const keys = Object.keys(value).sort();
  if (_.isEmpty(keys)) {
    return '{}';
  }

  let separator = '';
  let result = '{\n';

  for (const key of keys) {
    const v = value[key];
    if (skipMember(v)) {
      continue;
    }

    result += `${separator}${indent(
      depth + 1,
      `${JSON.stringify(key)}: ${stringify(v, depth + 1)}`
    )}`;
    separator = ',\n';
  }

  return `${result}\n${indent(depth, '}')}`;
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

        files
          .filter(file => file.endsWith('.json'))
          .forEach(file => {
            const box = JSON.parse(fs.readFileSync(path.join(userDataRoot, file)).toString());
            box.messages.forEach((message: any) => {
              message.date = new Date(Date.parse(message.date));
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
        adjacencyTable: box.adjacencyTable,
        box: box.box,
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
