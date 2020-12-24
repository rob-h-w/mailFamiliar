package com.robwilliamson.mailfamiliar.events;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.model.Id;
import lombok.Getter;

import java.util.*;

@Getter
public class ImapMessage extends ImapEvent {
  private final Map<String, List<String>> mailHeaders;
  private final Message message;

  public ImapMessage(
      Object source,
      Id<Imap> imapAccountId,
      Map<String, List<String>> mailHeaders,
      Message message) {
    super(source, imapAccountId);
    this.mailHeaders = mailHeaders;
    this.message = message;
  }
}
