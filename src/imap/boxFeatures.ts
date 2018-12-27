import {Literal, Static, Union} from 'runtypes';

const DraftsBoxValues = Union(Literal('DRAFTS'));
export type DraftsBox = Static<typeof DraftsBoxValues>;
const InboxValues = Union(Literal('INBOX'));
export type InBox = Static<typeof InboxValues>;
const SentBoxValues = Union(Literal('SENT'), Literal('SENT ITEMS'));
export type SentBox = Static<typeof SentBoxValues>;
const SpamBoxValues = Union(Literal('SPAM'), Literal('JUNK'));
export type SpamBox = Static<typeof SpamBoxValues>;
const TrashBoxValues = Union(Literal('TRASH'), Literal('RECYCLE'), Literal('DELETED ITEMS'));
export type TrashBox = Static<typeof TrashBoxValues>;

// Composite types
const KnownBoxValues = DraftsBoxValues.Or(InboxValues)
  .Or(SentBoxValues)
  .Or(TrashBoxValues);
export type KnownBox = Static<typeof KnownBoxValues>;
const DoNotLearnFromValues = DraftsBoxValues.Or(SentBoxValues);
export type DoNotLearnFrom = Static<typeof DoNotLearnFromValues>;
const DoNotMoveToValues = DraftsBoxValues.Or(SentBoxValues).Or(TrashBoxValues);
export type DoNotMoveTo = Static<typeof DoNotMoveToValues>;

export function canLearnFrom(boxName: string) {
  return !DoNotLearnFromValues.guard(boxName.toUpperCase());
}

export function canMoveTo(boxName: string) {
  return !DoNotMoveToValues.guard(boxName.toUpperCase());
}
