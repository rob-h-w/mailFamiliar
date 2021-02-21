package com.robwilliamson.mailfamiliar.events;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.service.imap.ImapHeaders;
import lombok.Getter;

import java.util.*;

@Getter
public class ImapMessage extends ImapEvent {
  private final ImapHeaders imapHeaders;
  private final Message message;

  public ImapMessage(
      Object source,
      Id<Imap> imapAccountId,
      Map<String, List<String>> imapHeaders,
      Message message) {
    this(
        source,
        imapAccountId,
        new ImapHeaders(imapHeaders),
        message
    );
  }

  public ImapMessage(
      Object source,
      Id<Imap> imapAccountId,
      ImapHeaders imapHeaders,
      Message message) {
    super(source, imapAccountId);
    this.imapHeaders = imapHeaders;
    this.message = message;
  }
}
