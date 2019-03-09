import * as fs from 'fs';
import * as path from 'path';

export async function useFixture() {
  const foldersUp = ['..', '..', '..'];
  const dataSource = path.join(__dirname, ...foldersUp, 'fixtures', 'standard');
  const dataStorage = path.join(dataSource, 'root');
  const dataDestination = path.join(
    dataStorage,
    'd4764d8f3c61cb5d81a5326916cac5a1c2f221acc5895c508fa3e0059d927f99'
  );
  process.env.M_FAMILIAR_STORAGE = dataStorage;

  const datafiles = fs
    .readdirSync(path.join(__dirname, ...foldersUp, 'fixtures', 'standard'))
    .filter(name => name.endsWith('.json'));

  for (const dataFile of datafiles) {
    fs.copyFileSync(path.join(dataSource, dataFile), path.join(dataDestination, dataFile));
  }
}
