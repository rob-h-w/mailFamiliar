const { expect } = require('code');
const { afterEach, beforeEach, describe, it } = exports.lab = require('lab').script();
const mockery = require('mockery');
const sinon = require('sinon');

let imap;
let persistence;
let UserConnection;
let userConnection;

describe('userConnection', () => {
  beforeEach(() => {
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false
    });

    imap = {
      mailBoxes: {},
      user: {}
    };

    mockery.registerAllowable('../../../src/imap/userConnection');
    mockery.registerAllowable('./box');

    UserConnection = require('../../../src/imap/userConnection').default;
  });

  afterEach(() => {
    mockery.disable();
  });

  it('is a class', () => {
    expect(UserConnection).to.be.a.function();
  });

  describe('object', () => {
    beforeEach(() => {
      persistence = {
        createBox: sinon.stub(),
        deleteBox: sinon.stub(),
        listBoxes: sinon.stub()
      };
    });

    describe('created with no prior boxes & no online boxes', () => {
      beforeEach(async () => {
        persistence.listBoxes.returns([]);
        userConnection = await UserConnection.create(imap, persistence);
      });

      it('exposes boxes', () => {
        expect(userConnection.boxes).to.exist();
        expect(userConnection.boxes).to.be.an.array();
      });

      it('does not create or delete boxes', () => {
        expect(persistence.createBox.called).to.be.false();
        expect(persistence.deleteBox.called).to.be.false();
      });
    });

    describe('created with no prior boxes & an online box', () => {
      beforeEach(async () => {
        imap.mailBoxes = {
          INBOX: {}
        };
        persistence.listBoxes.returns([]);
        userConnection = await UserConnection.create(imap, persistence);
      });

      it('does not delete boxes', () => {
        expect(persistence.deleteBox.called).to.be.false();
      });

      it('creates a persisted box', () => {
        expect(persistence.createBox.calledOnce).to.be.true();
        expect(persistence.createBox.firstCall.args[0]).to.equal(imap.user);
      });

      it('exposes the box', () => {
        expect(userConnection.boxes.length).to.equal(1);
        expect(userConnection.boxes[0].name).to.equal('INBOX');
      });
    });

    describe('created with a prior box that should be deleted & an online box', () => {
      const deletedBox = {};

      beforeEach(async () => {
        imap.mailBoxes = {
          INBOX: {}
        };
        persistence.listBoxes.returns([
          deletedBox
        ]);
        userConnection = await UserConnection.create(imap, persistence);
      });

      it('deletes the old box', () => {
        expect(persistence.deleteBox.calledOnce).to.be.true();
        expect(persistence.deleteBox.firstCall.args).to.equal([imap.user, deletedBox]);
      });

      it('creates a persisted box', () => {
        expect(persistence.createBox.calledOnce).to.be.true();
        expect(persistence.createBox.firstCall.args[0]).to.equal(imap.user);
      });

      it('exposes the box', () => {
        expect(userConnection.boxes.length).to.equal(1);
        expect(userConnection.boxes[0].name).to.equal('INBOX');
      });
    });
  });
});
