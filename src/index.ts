import * as Hapi from 'hapi';

import glue from './glue';
import logger from './logger';

declare const process: any;
declare const __filename: string;

function ignore(reason: any): boolean {
  if (!reason) {
    return false;
  }

  if (reason.type === 'bad' && reason.source === 'protocol') {
    return true;
  }

  return false;
}

function handleError(reason: Error) {
  logger.error(reason);

  if (ignore(reason)) {
    return;
  }

  setTimeout(() => {
    process.exit(1);
  }, 10);
}

export async function startServer(): Promise<object>;
export async function startServer() {
  process.on('uncaughtException', (reason: Error) => {
    handleError(reason);
  });

  process.on('unhandledRejection', (reason: Error) => {
    handleError(reason);
  });

  logger.info('initializing workers');

  await glue.init();

  logger.info('creating HTTP server');

  const server: Hapi.Server = new Hapi.Server({
    port: 8080
  });

  server.events.on('log', (event: Hapi.LogEvent, tags: {[key: string]: true}) => {
    logger.info({event, tags});
  });

  logger.info('starting HTTP server');

  await server.start();

  logger.info('started');

  return server;
}

if (process.mainModule.filename === __filename) {
  startServer();
}
