package com.robwilliamson.mailfamiliar.events;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.model.Id;
import lombok.Getter;

@Getter
public class FolderSynchronized extends ImapEvent {
  private final Mailbox mailbox;

  public FolderSynchronized(Object source, Mailbox mailbox) {
    super(source, Id.of(mailbox.getImapAccountId(), Imap.class));
    this.mailbox = mailbox;
  }
}
