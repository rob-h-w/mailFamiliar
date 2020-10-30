package com.robwilliamson.mailfamiliar.service.predictor;

import com.robwilliamson.mailfamiliar.entity.Mailbox;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.service.imap.ImapHeaders;

import java.util.Map;

public interface Predictor {
  void addHeaders(Id<Mailbox> mailboxId, ImapHeaders headers);

  void addMistake(Mistake mistake);

  Map<Id<Mailbox>, Double> folderScoresFor(ImapHeaders headers);

  void removeHeaders(Id<Mailbox> mailboxId, ImapHeaders headers);

  void removeMistake(Mistake mistake);
}
