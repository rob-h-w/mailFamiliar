const { expect } = require('code');
const { afterEach, beforeEach, describe, it } = exports.lab = require('lab').script();
const mockery = require('mockery');
const sinon = require('sinon');

import IPersistence from "../../../src/persistence/persistence";
import User from '../../../src/persistence/user';

let Imap;
let imap;
let persistence: IPersistence;
let user: User;
let UserConnection;
let userConnection;

let Synchronizer;
let synchronizer;

describe('Synchronizer', () => {
  beforeEach(() => {
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false
    });

    user = {
      user: 'rob@example.com',
      password: '000',
      host: 'imap.example.com',
      port: 143,
      tls: true
    };
    persistence = {
      deleteBox: sinon.stub().resolves(),
      createBox: sinon.stub().resolves(),
      createUser: sinon.stub(),
      init: sinon.stub(),
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

    mockery.registerMock('../imap/imap', { default: Imap });
    mockery.registerMock('../imap/userConnection', { default: UserConnection });

    mockery.registerAllowable('../../../src/engine/synchronizer');

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
      expect((<any> persistence.listUsers).called).to.be.true();
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
