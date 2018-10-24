const { expect } = require('code');
const { afterEach, beforeEach, describe, it } = exports.lab = require('lab').script();
const mockery = require('mockery');
const sinon = require('sinon');

import Persistence from "../../../src/persistence/persistence";
import User from '../../../src/persistence/user';

let Imap;
let imap;
let persistence: Persistence;
let user: User;

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
      createBox: sinon.stub(),
      createUser: sinon.stub(),
      init: sinon.stub(),
      listBoxes: sinon.stub(),
      listUsers: sinon.stub().resolves([user])
    };

    imap = {
      init: sinon.stub().resolves()
    };
    Imap = sinon.stub().returns(imap);

    mockery.registerMock('./imap', { default: Imap });

    mockery.registerAllowable('../../../src/imap/synchronizer');

    Synchronizer = require('../../../src/imap/synchronizer').default;
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
  });
});
