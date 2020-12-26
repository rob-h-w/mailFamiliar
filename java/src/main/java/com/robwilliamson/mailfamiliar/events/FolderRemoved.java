package com.robwilliamson.mailfamiliar.events;

import com.robwilliamson.mailfamiliar.entity.Mailbox;
import lombok.Getter;

@Getter
public class FolderRemoved extends ImapEvent {
  private final Mailbox mailbox;

  public FolderRemoved(Object source, Mailbox mailbox) {
    super(source, mailbox.getImapAccountIdObject());
    this.mailbox = mailbox;
  }
}
