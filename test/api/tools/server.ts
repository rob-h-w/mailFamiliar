import * as _ from 'lodash';
import * as path from 'path';

const ROOT = process.cwd();
const SERVER = path.join(ROOT, 'src', 'index');

export async function startServerInHealthyState(): Promise<any> {
  const {startServer} = require(SERVER);
  const server = await startServer();

  return server;
}
