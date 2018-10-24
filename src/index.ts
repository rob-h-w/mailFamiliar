import Hapi = require('hapi');

import glue from './glue';
import logger from './logger';

declare const process:any;
declare const __filename:string;

function handleError(reason) {
  logger.error(reason);
  setTimeout(() => {
    process.exit(1);
  }, 10);
}

export async function startServer():Promise<object>;
export async function startServer() {
  process.on('uncaughtException', (reason) => {
    handleError(reason);
  });

  process.on('unhandledRejection', (reason) => {
    handleError(reason);
  });

  logger.info('initializing workers');

  await glue.init();

  logger.info('creating HTTP server');

  const server:any = Hapi.server({
    port: 8080
  });

  server.events.on('log', (event, tags) => {
    logger.info({ event, tags, });
  });

  logger.info('starting HTTP server');

  await server.start();

  logger.info('started');

  return server;
}

if (process.mainModule.filename === __filename) {
  startServer();
}
