import {Config} from 'imap';

export interface TrialSettings {
  lastSyncedDaysAgo: number;
  logFile?: string;
  logToStdOut: boolean;
  newMailHandled: () => void;
  predictor?: string;
}

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
  trial?: TrialSettings;
}

export default User;
