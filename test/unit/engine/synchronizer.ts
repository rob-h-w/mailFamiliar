import {expect} from 'code';
const {afterEach, beforeEach, describe, it} = (exports.lab = require('lab').script());
import * as mockery from 'mockery';
import * as sinon from 'sinon';

import IPersistence from '../../../src/persistence/persistence';
import User from '../../../src/persistence/user';

let Imap: any;
let imap: any;
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
      host: 'imap.example.com',
      password: '000',
      port: 143,
      tls: true,
      user: 'rob@example.com'
    };
    persistence = {
      createBox: sinon.stub().resolves(),
      createUser: sinon.stub(),
      deleteBox: sinon.stub().resolves(),
      listBoxes: sinon.stub().resolves([]),
      listUsers: sinon.stub().resolves([user])
    };

    userConnection = {};
    UserConnection = sinon.stub();
    UserConnection.create = sinon.stub().returns(userConnection);

    imap = {
      init: sinon.stub().resolves()
    };
    Imap = sinon.stub().returns(imap);

    mockery.registerMock('../imap/imap', {default: Imap});
    mockery.registerMock('../imap/userConnection', {default: UserConnection});

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

    it('creates an Imap connection object for the user', () => {
      expect(Imap.called).to.be.true();
      expect(Imap.firstCall.args).to.equal([user]);
    });

    it('creates a UserConnection object for the Imap connection', () => {
      expect(UserConnection.create.called).to.be.true();
      expect(UserConnection.create.firstCall.args).to.equal([imap, persistence]);
    });
  });
});
