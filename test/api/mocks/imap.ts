import * as Imap from 'imap';
import * as sinon from 'sinon';

type Folder = {[key in keyof Imap.Folder]: Imap.Folder[key] | null};

interface Mailboxes {
  [name: string]: Folder;
}

export interface MockResult {
  class: any;
  object: any;
}

export default function imap(mailBoxes: Mailboxes, boxes: ReadonlyArray<Imap.Box>): MockResult {
  const object = {
    closeBox: sinon.stub().callsArg(0),
    connect: sinon.stub(),
    getBoxes: sinon.stub().callsArgWith(0, null, mailBoxes),
    move: sinon.stub().callsArgWith(0, null),
    on: sinon.stub(),
    once: sinon.stub(),
    openBox: sinon.stub(),
    search: sinon.stub().callsArgWith(1, null, []),
    subscribeBox: sinon.stub().callsArg(1)
  };

  for (const box of boxes) {
    object.openBox.withArgs(box.name).callsArgWith(1, null, box);
  }

  return {
    class: sinon.stub().returns(object),
    object
  };
}
