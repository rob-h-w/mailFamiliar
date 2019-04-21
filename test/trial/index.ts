import * as cli from 'cli';
import glue from '../../src/glue';
import {useTrialSettings} from '../../src/tools/trialSettings';

const options = cli.parse({
  days_ago: ['d', 'Days ago to use as "now".', 'int', 1],
  log_file: ['f', 'Log to file', 'file'],
  std_log: ['l', 'Log to stdout.', 'true', false]
});

useTrialSettings({
  lastSyncedDaysAgo: options.days_ago,
  logToStdOut: options.std_log
});

glue.init().then(() => process.exit());
