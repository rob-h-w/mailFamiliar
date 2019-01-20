import {Config} from 'imap';

interface User extends Config {
  dryRun: boolean;
  moveThreshold: number;
  syncWindowDays: number;
}

export default User;
