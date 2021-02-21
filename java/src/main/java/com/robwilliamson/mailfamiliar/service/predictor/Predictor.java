package com.robwilliamson.mailfamiliar.service.predictor;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.service.imap.ImapHeaders;

import java.util.Map;

public interface Predictor {
  void addHeaders(Id<Imap> accountId, Id<Mailbox> mailboxId, ImapHeaders headers);

  void addMistake(Id<Imap> accountId, Mistake mistake);

  Map<Id<Mailbox>, Double> folderScoresFor(Id<Imap> accountId, ImapHeaders headers);

  void removeHeaders(Id<Imap> accountId, Id<Mailbox> mailboxId, ImapHeaders headers);

  void removeMistake(Id<Imap> accountId, Mistake mistake);
}
