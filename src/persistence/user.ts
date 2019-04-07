import {Config} from 'imap';

interface User extends Config {
  dryRun: boolean;
  moveThreshold: number;
  reconnect: {
    backoffs: number;
    multiplier: number;
    timeoutSeconds: number;
  };
  refreshPeriodMinutes: number;
  syncWindowDays: number;
}

export default User;
