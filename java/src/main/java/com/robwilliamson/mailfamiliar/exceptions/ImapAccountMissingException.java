package com.robwilliamson.mailfamiliar.exceptions;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.model.Id;
import lombok.Getter;

@Getter
public class ImapAccountMissingException extends Throwable {
  private final Id<Imap> imapAccountId;

  public ImapAccountMissingException(Id<Imap> imapAccountId) {
    super("Could not find an active IMAP account matching record ID "
        + imapAccountId.getValue());
    this.imapAccountId = imapAccountId;
  }
}
