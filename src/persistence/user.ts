import {Config} from 'imap';
import {PredictorType} from '../engine/predictors';

export interface TrialSettings {
  lastSyncedDaysAgo: number;
  logFile?: string;
  logToStdOut: boolean;
  newMailHandled: () => void;
}

interface User extends Config {
  dryRun: boolean;
  moveThreshold: number;
  predictorType?: PredictorType;
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
