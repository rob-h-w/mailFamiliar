import * as cli from 'cli';
import glue from '../../src/glue';
import {useTrialSettings} from '../../src/tools/trialSettings';
import {PredictorTypeValues} from '../../src/engine/predictors';

const options = cli.parse({
  days_ago: ['d', 'Days ago to use as "now".', 'int', 1],
  log_file: ['f', 'Log to file', 'file'],
  predictor: ['p', `Predictor to use ${PredictorTypeValues}`, 'string'],
  std_log: ['l', 'Log to stdout.', 'boolean', false]
});

if (options.predictor) {
  if (!PredictorTypeValues.guard(options.predictor)) {
    // tslint:disable-next-line:no-console
    console.error(`Invalid predictor selected (${options.predictor})\n`);
    cli.getUsage(1);
  }
}

let terminateTimeout: NodeJS.Timeout | null = null;

useTrialSettings({
  lastSyncedDaysAgo: options.days_ago,
  logFile: options.log_file,
  logToStdOut: options.std_log,
  newMailHandled: () => {
    if (terminateTimeout) {
      clearTimeout(terminateTimeout);
    }

    terminateTimeout = setTimeout(process.exit, 5000);
  }
});

glue.init();
