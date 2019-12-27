import {expect} from '@hapi/code';
const {describe, it} = (exports.lab = require('@hapi/lab').script());

import addStringToDiff from '../../../src/string/addStringToDiff';
import Diff from '../../../src/string/diff';

function expectAddStringToDiff(diff: Diff, str: string) {
  return expect<Diff>(addStringToDiff(diff, str));
}

describe('addStringToDiff', () => {
  it('does not modify the diff if the string is empty', () => {
    expectAddStringToDiff([null, 'abc', null], '').to.equal([null, 'abc', null]);
  });

  it('creates an empty diff if the input diff is empty', () => {
    expectAddStringToDiff([], 'abcd').to.equal([]);
  });

  it('creates an empty diff if there is no match with the input diff', () => {
    expectAddStringToDiff([null, 'snoot', null], 'nsto').to.equal([]);
  });

  it('creates a new diff, gains leading null', () => {
    expectAddStringToDiff(['abcd'], 'wooab0cd').to.equal([null, 'ab', null, 'cd']);
  });

  it('creates a new diff, does not lose leading null', () => {
    expectAddStringToDiff([null, 'abcd'], 'ab0cd').to.equal([null, 'ab', null, 'cd']);
  });

  it('creates a new diff, does not lose trailing null', () => {
    expectAddStringToDiff([null, 'abcd', null], 'ab0cd').to.equal([null, 'ab', null, 'cd', null]);
  });

  it('creates a new diff, does not gain leading null', () => {
    expectAddStringToDiff(['abcd'], 'ab0cd').to.equal(['ab', null, 'cd']);
  });

  it('creates a new diff, loses non-matching characters', () => {
    expectAddStringToDiff(['abcd'], 'abc').to.equal(['abc', null]);
  });

  it('does not lose existing null patterns if a match is added', () => {
    expectAddStringToDiff(['ab', null, 'cd', null, 'ef'], 'abcdef').to.equal([
      'ab',
      null,
      'cd',
      null,
      'ef'
    ]);
  });
});
