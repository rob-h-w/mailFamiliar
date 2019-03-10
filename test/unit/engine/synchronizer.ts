import {expect} from 'code';
const {afterEach, beforeEach, describe, it} = (exports.lab = require('lab').script());
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
      listUsers: sinon.stub().resolves([user]),
      updateBox: sinon.stub().resolves()
    };

    userConnection = {};
    UserConnection = sinon.stub();
    UserConnection.create = sinon.stub().returns(userConnection);
    UserConnection.refresh = sinon.stub().resolves();

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
      expect(UserConnection.create.calledOnce).to.be.true();
    });

    it('shallow syncs the user connection', () => {
      expect(UserConnection.refresh.calledOnce).to.be.true();
    });
  });
});
