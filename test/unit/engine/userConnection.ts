const { expect } = require('code');
const { afterEach, beforeEach, describe, it } = exports.lab = require('lab').script();
const mockery = require('mockery');
const sinon = require('sinon');

let imap;
let UserConnection;
let userConnection;

describe('userConnection', () => {
  beforeEach(() => {
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false
    });

    imap = {};

    mockery.registerAllowable('../../../src/engine/userConnection');

    UserConnection = require('../../../src/engine/userConnection').default;
  });

  afterEach(() => {
    mockery.disable();
  });

  it('is a class', () => {
    expect(UserConnection).to.be.a.function();
  });

  describe('object', () => {
    describe('created with no prior boxes', () => {
      beforeEach(() => {
        userConnection = new UserConnection(imap);
      });

      it('exposes boxes', () => {
        expect(userConnection.boxes).to.exist();
        expect(userConnection.boxes).to.be.an.array();
      })
    });
  });
});
