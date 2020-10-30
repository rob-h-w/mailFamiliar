package com.robwilliamson.mailfamiliar.service.imap.events;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.model.Id;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class FolderRemoved extends ImapEvent<Mailbox> {
  private final Mailbox mailbox;

  @Override
  protected Id<Imap> getImapAccountId() {
    return mailbox.getImapAccountIdObject();
  }

  @Override
  public Mailbox getPayload() {
    return mailbox;
  }
}
