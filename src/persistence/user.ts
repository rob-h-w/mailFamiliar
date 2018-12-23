import {Config} from 'imap';

interface User extends Config {
  syncWindowDays: number;
}

export default User;
