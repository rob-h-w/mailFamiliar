export default interface MockMessage {
  attributes: {
    date: Date;
    flags: any[];
    uid: number;
  };
  body: Buffer;
  seqno: number;
  synced: boolean;
}
