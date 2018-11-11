export default class Box {
  attribs: Array<string>;
  delimiter: string;
  name: string;
  parent: Box;
  qualifiedName: string;
  syncedTo: number;

  public constructor({
    attribs,
    delimiter,
    name,
    parent,
    qualifiedName,
    syncedTo
  }) {
    this.attribs = attribs;
    this.delimiter = delimiter;
    this.name = name;
    this.parent = parent;
    this.qualifiedName = qualifiedName;
    this.syncedTo = syncedTo;
  }

  public mergeFrom(box: Box) {
    if (box.qualifiedName !== this.qualifiedName) {
      throw new Error(`Attempt to merge ${box.qualifiedName} into ${this.qualifiedName}`)
    }

    this.attribs = box.attribs;
    this.syncedTo = box.syncedTo;
  }
};
