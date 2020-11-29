package com.robwilliamson.mailfamiliar.event;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.model.Id;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.*;

@Getter
public class ImapMessage extends ApplicationEvent {
  private final Map<String, List<String>> mailHeaders;
  private final Id<Imap> imapAccountId;
  private final Message message;

  public ImapMessage(
      Object source,
      Map<String, List<String>> mailHeaders,
      Id<Imap> imapAccountId,
      Message message) {
    super(source);
    this.mailHeaders = mailHeaders;
    this.imapAccountId = imapAccountId;
    this.message = message;
  }
}
