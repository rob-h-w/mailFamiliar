package com.robwilliamson.mailfamiliar.events;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.service.ImapAccountService;
import lombok.Getter;

@Getter
public class NewImapAccount extends ImapEvent {
  private final Imap imap;

  public NewImapAccount(ImapAccountService source, Imap imap) {
    super(source, imap.getAccountId());
    this.imap = imap;
  }
}
