export interface ImapBox {
  attribs: Array<string>;
  delimiter: string;
  children: ImapBoxList;
  parent: unknown;
};

export interface ImapBoxList {
  [id: string]: ImapBox;
};
