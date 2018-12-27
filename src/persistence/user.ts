import {Config} from 'imap';

interface User extends Config {
  moveThreshold: number;
  syncWindowDays: number;
}

export default User;
