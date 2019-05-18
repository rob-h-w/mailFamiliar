import * as f from 'fs';
import * as _ from 'lodash';
import * as path from 'path';
import {stub} from 'sinon';

import User from '../../../src/persistence/user';

const ROOT = process.cwd();
export const LOGSFOLDER = path.join(ROOT, 'logs');
const LOGPATH = path.join(LOGSFOLDER, 'mailFamiliar.log');
export const M_FAMILIAR_STORAGE = '/storage';
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
  config: () => Fluent;
  fs: () => any | null;
  setup: () => Fluent;
  teardown: () => void;
}

class Fluent {
  private mockResult: MockResult;

  constructor(mockResult: MockResult) {
    this.mockResult = mockResult;
  }

  withConfig(
    config?: Partial<User>,
    filename: string = 'user.json',
    useFakeConfig: boolean = true
  ): Fluent {
    const mockResult = this.mockResult.fs();

    if (useFakeConfig) {
      mockResult.readdir.callsFake(
        (path: string, callback: (err: Error | null, files: string[]) => void) => {
          if (path === process.env.M_FAMILIAR_STORAGE) {
            callback(null, [filename]);
          } else if (
            process.env.M_FAMILIAR_STORAGE &&
            path.startsWith(process.env.M_FAMILIAR_STORAGE)
          ) {
            callback(null, []);
          } else {
            return f.readdir(path, callback);
          }
        }
      );
    }

    const folderPath = process.env.M_FAMILIAR_STORAGE || M_FAMILIAR_STORAGE;
    const userPath = path.join(folderPath, filename);

    mockResult.statSync.withArgs(userPath).returns({
      isFile: stub().returns(true)
    });

    const rawSettings = useFakeConfig
      ? USER_SETTINGS
      : JSON.parse(f.readFileSync(userPath).toString());
    const settings = {...rawSettings, ...config};
    mockResult.readFileSync.withArgs(userPath).returns(JSON.stringify(settings));
    return this;
  }

  withLog(): Fluent {
    const f = this.mockResult.fs();
    f.existsSync.withArgs(LOGSFOLDER).returns(true);
    const writeStream = {
      end: stub().returns(false),
      write: stub().callsFake((...args) => {
        // tslint:disable-next-line:no-console
        console.log(...args);
      })
    };

    f.createWriteStream
      .withArgs(LOGPATH, {
        encoding: 'utf8',
        flags: 'a'
      })
      .returns(writeStream);
    return this;
  }
}

export default function fs(): MockResult {
  let fsStub: any = null;
  const setup = (): Fluent => {
    fsStub = stub(f);
    _.functions(fsStub).forEach(func => {
      const potentialStub = fsStub[func];
      if (potentialStub.callThrough) {
        fsStub[func].callThrough();
      }
    });

    return new Fluent(result);
  };
  const result = {
    config: (): Fluent => new Fluent(result),
    fs: () => fsStub,
    setup,
    teardown: () => {
      _.functions(fsStub).forEach(f => {
        const potentialStub = fsStub[f];

        if (potentialStub.restore) {
          fsStub[f].restore();
        }
      });
    }
  };
  return result;
}
