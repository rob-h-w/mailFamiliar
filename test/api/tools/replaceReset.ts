import * as sinon from 'sinon';

export default function replaceReset(stub: sinon.SinonStub, f: (stub: sinon.SinonStub) => void) {
  const originalReset = stub.reset;
  stub.reset = () => {
    originalReset.apply(stub);
    f(stub);
  };

  stub.reset();
}
