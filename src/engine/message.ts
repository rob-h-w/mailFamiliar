interface IEnvelope {
  bcc: string[];
  cc: string[];
  date: Date;
  from: string[];
  inReplyTo: string[];
  messageId: string;
  replyTo: string[];
  sender: string[];
  subject: string;
  to: string[];
}

export interface IMessage {
  envelope: IEnvelope;
  headers: string;
  size?: number;
  uid: number;
}
