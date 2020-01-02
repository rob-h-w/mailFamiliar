import {expect} from '@hapi/code';
const {afterEach, beforeEach, describe, it} = (exports.lab = require('@hapi/lab').script());
import * as mockery from 'mockery';
import * as sinon from 'sinon';

import IPersistence from '../../../src/persistence/persistence';
import User from '../../../src/persistence/user';

let persistence: IPersistence;
let user: User;
let UserConnection: any;
let userConnection: any;

let Synchronizer: any;
let synchronizer: any;

describe('Synchronizer', () => {
  beforeEach(() => {
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    user = {
      dryRun: false,
      host: 'imap.example.com',
      moveThreshold: 0.1,
      password: '000',
      port: 143,
      reconnect: {
        backoffs: 5,
        multiplier: 2,
        timeoutSeconds: 5
      },
      refreshPeriodMinutes: 60,
      syncWindowDays: 1,
      tls: true,
      user: 'rob@example.com'
    };
    persistence = {
      createBox: sinon.stub().resolves(),
      createUser: sinon.stub(),
      deleteBox: sinon.stub().resolves(),
      listBoxes: sinon.stub().resolves([]),
      listMoves: sinon.stub().resolves([]),
      listUsers: sinon.stub().resolves([user]),
      recordMoves: sinon.stub().resolves(),
      updateBox: sinon.stub().resolves()
    };

    userConnection = {
      init: sinon.stub().resolves()
    };
    UserConnection = sinon.stub().returns(userConnection);

    mockery.registerMock('./userConnection', {default: UserConnection});

    Synchronizer = require('../../../src/engine/synchronizer').default;
  });

  afterEach(() => {
    mockery.disable();
  });

  it('is a class', () => {
    expect(Synchronizer).to.exist();
    expect(Synchronizer).to.be.a.function();
  });

  describe('instantiation', () => {
    beforeEach(() => {
      synchronizer = new Synchronizer(persistence);
    });

    it('returns an object', () => {
      expect(synchronizer).to.exist();
      expect(synchronizer).to.be.an.object();
    });
  });

  describe('init', () => {
    beforeEach(async () => {
      synchronizer = new Synchronizer(persistence);
      await synchronizer.init();
    });

    it('lists the users', () => {
      expect((persistence.listUsers as sinon.SinonStub).called).to.be.true();
    });

    it('creates a user connection', () => {
      expect(UserConnection.calledOnce).to.be.true();
    });

    it('initializes the user connection', () => {
      expect(userConnection.init.calledOnce).to.be.true();
    });
  });
});
