const bunyan:any = require('bunyan');
const file:any = require('fs');
const path:any = require('path');

declare const process:any;
declare const require:Function;

const { name } = require('../package.json');

const LOG_DIR = 'logs';

const LOG_STDOUT_LEVEL = process.env.LOG_STDOUT_LEVEL || 'debug';
const LOG_FILE_LEVEL = process.env.LOG_FILE_LEVEL || 'warn';
const LOG_FILE = process.env.LOG_FILE || path.join(process.cwd(), LOG_DIR, 'mailFamiliar.log');
const LOG_FOLDER = path.dirname(LOG_FILE);
const LOG_ROTATE_PERIOD = process.env.LOG_ROTATE_PERIOD || '1d';
const LOG_RETENTION_COUNT = process.env.LOG_RETENTION_COUNT || 3;

if (!file.existsSync(LOG_FOLDER)) {
  file.mkdirSync(LOG_DIR);
}

export const logger = bunyan.createLogger({
  name,
  src: true,
  streams: [{
    count: Number(LOG_RETENTION_COUNT),
    level: LOG_FILE_LEVEL,
    path: LOG_FILE,
    period: LOG_ROTATE_PERIOD,
    type: 'rotating-file'
  },
  {
    level: LOG_STDOUT_LEVEL,
    stream: process.stdout
  }]
});
