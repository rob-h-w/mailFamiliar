import * as Hapi from '@hapi/hapi';

import glue from './glue';
import logger from './logger';
import ListenerManager, {ServerEventsListenerManager} from './events/listenerManager';

declare const process: any;
declare const __filename: string;

let processManager: ListenerManager;
let serverEventsManager: ServerEventsListenerManager;

function ignore(reason: any): boolean {
  if (!reason) {
    return false;
  }

  if (reason.type === 'bad' && reason.source === 'protocol') {
    logger.warn('bad protocol error');
    return true;
  }

  return false;
}

function handleError(reason: Error): void {
  logger.error(reason);

  if (ignore(reason) || glue.handleError(reason)) {
    return;
  }

  logger.fatal('!!!!!!!!!!!!!!!!!!!!! Exiting !!!!!!!!!!!!!!!!!!!!!!!!');
  serverEventsManager.close();
  processManager.close();
  const processExit = process.exit;
  setTimeout(() => {
    processExit(1);
  }, 10);
}

export async function startServer() {
  processManager = new ListenerManager(process);
  processManager.on('uncaughtException', (reason: Error) => {
    handleError(reason);
  });

  processManager.on('unhandledRejection', (reason: Error) => {
    handleError(reason);
  });

  logger.info('initializing workers');

  await glue.init();

  logger.info('creating HTTP server');

  const server: Hapi.Server = new Hapi.Server({
    port: 8080,
  });

  serverEventsManager = new ServerEventsListenerManager(server.events);
  serverEventsManager.on('log', (event: Hapi.LogEvent, tags: {[key: string]: true}) => {
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
