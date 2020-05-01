import {stub, SinonStub} from 'sinon';

export default function stubExit(before: any, after: any) {
  before(() => stub(process, 'exit'));
  after(() => exit().restore());
}

export function exit(): SinonStub {
  return (process.exit as unknown) as SinonStub;
}
