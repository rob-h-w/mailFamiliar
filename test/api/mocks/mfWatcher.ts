import {until} from '../tools/wait';
import {MockResult} from './bunyan';

export default {
  waitFor: {
    syncComplete: async (bunyanMock: MockResult) =>
      until(() => bunyanMock.logger.info.calledWith('shallow sync complete'))
  }
};
