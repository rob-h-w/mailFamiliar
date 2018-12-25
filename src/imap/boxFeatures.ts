import * as Imap from 'imap';
import {Literal, Static, Union} from 'runtypes';

export const DraftsBoxValues = Union(Literal('DRAFTS'));
export type DraftsBox = Static<typeof DraftsBoxValues>;
export const InboxValues = Union(Literal('INBOX'));
export type InBox = Static<typeof InboxValues>;
export const SentBoxValues = Union(Literal('SENT'), Literal('SENT ITEMS'));
export type SentBox = Static<typeof SentBoxValues>;
export const SpamBoxValues = Union(Literal('SPAM'), Literal('JUNK'));
export type SpamBox = Static<typeof SpamBoxValues>;
export const TrashBoxValues = Union(Literal('TRASH'), Literal('RECYCLE'));
export type TrashBox = Static<typeof TrashBoxValues>;

// Composite types
export const KnownBoxValues = DraftsBoxValues.Or(InboxValues)
  .Or(SentBoxValues)
  .Or(TrashBoxValues);
export type KnownBox = Static<typeof KnownBoxValues>;
export const DoNotLearnFromValues = DraftsBoxValues.Or(SentBoxValues);
export type DoNotLearnFrom = Static<typeof DoNotLearnFromValues>;
export const DoNotMoveToValues = DraftsBoxValues.Or(InboxValues).Or(TrashBoxValues);
export type DoNotMoveTo = Static<typeof DoNotMoveToValues>;

export function canLearnFrom(box: Imap.Box) {
  return !DoNotLearnFromValues.guard(box.name.toUpperCase());
}
