package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.model.Id;
import org.springframework.messaging.MessageHeaders;

import java.util.Map;

public class ImapEvent {
  private ImapEvent() {
  }

  public static MessageHeaders headers(Id<Imap> imapAccountId) {
    return new MessageHeaders(Map.of(
        "imapAccountId", imapAccountId
    ));
  }
}
