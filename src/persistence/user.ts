import {Config} from 'imap';

interface User extends Config {
  dryRun: boolean;
  moveThreshold: number;
  refreshPeriodMinutes: number;
  syncWindowDays: number;
}

export default User;
