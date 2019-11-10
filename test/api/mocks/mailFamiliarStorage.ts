import * as fs from 'fs';
import * as _ from 'lodash';
import * as path from 'path';
import * as temp from 'temp';

import User from '../../../src/persistence/user';
import {hashOf} from '../../../src/persistence/json';

temp.track();
const FOLDERS = ['test', 'tmp'];
const TEMP_AFFIXES = {
  dir: path.join(process.cwd(), ...FOLDERS)
};

const USER_SETTINGS: User = {
  dryRun: true,
  host: 'imap.example.com',
  moveThreshold: 0.1,
  password: '123',
  port: 143,
  reconnect: {
    backoffs: 2,
    multiplier: 2,
    timeoutSeconds: 1
  },
  refreshPeriodMinutes: 60,
  syncWindowDays: 60,
  tls: true,
  user: 'rob@example.com'
};

export interface MockResult {
  root: string;
  storagePath: string;
}

export default function mockStorage(config?: Partial<User>, userName: string = 'user'): MockResult {
  const root = temp.mkdirSync(TEMP_AFFIXES);
  const fileName = `${userName}.json`;
  const configPath = path.join(root, fileName);
  const foldersPath = path.join(root, hashOf(userName));

  fs.writeFileSync(configPath, JSON.stringify({...USER_SETTINGS, ...config}));
  fs.mkdirSync(foldersPath);
  return {
    root,
    storagePath: foldersPath
  };
}

export function mockStorageAndSetEnvironment(
  config?: Partial<User>,
  userName: string = 'user'
): MockResult {
  const storage = mockStorage(config, userName);
  process.env.M_FAMILIAR_STORAGE = storage.root;
  return storage;
}
