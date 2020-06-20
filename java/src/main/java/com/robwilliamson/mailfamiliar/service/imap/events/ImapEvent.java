package com.robwilliamson.mailfamiliar.service.imap.events;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.model.Id;
import org.springframework.messaging.*;

import java.util.Map;

public abstract class ImapEvent<T> implements Message<T> {
  public static MessageHeaders headers(Id<Imap> imapAccountId) {
    return new MessageHeaders(Map.of(
        "imapAccountId", imapAccountId
    ));
  }

  protected abstract Id<Imap> getImapAccountId();

  @Override
  public MessageHeaders getHeaders() {
    return headers(getImapAccountId());
  }
}
