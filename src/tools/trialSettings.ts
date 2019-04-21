import Box from '../engine/box';
import User from 'persistence/user';
import {TrialSettings} from '../persistence/user';

let trialSettings: TrialSettings | undefined;

export function getSyncedTo(box: Box): number {
  return box.syncedTo - (trialSettings ? trialSettings.lastSyncedDaysAgo * 24 * 60 * 60 * 1000 : 0);
}

export function reset() {
  trialSettings = undefined;
}

export function withTrialSettings(user: User): User {
  return {
    trial: trialSettings,
    ...user
  };
}

export function useTrialSettings(settings: TrialSettings) {
  trialSettings = settings;
}
