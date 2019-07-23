import {createLogger} from 'bunyan';
import {SinonStub, SinonStubbedInstance, stub} from 'sinon';
import Logger = require('bunyan');

export interface MockResult {
  logger: SinonStubbedInstance<Logger>;
  object: {
    createLogger: SinonStub;
  };
}

export default function bunyan(): MockResult {
  const logger = stub(createLogger({name: 'mockLogger'}));
  return {
    logger,
    object: {
      createLogger: stub().returns(logger)
    }
  };
}
