package com.robwilliamson.mailfamiliar.service.imap.events;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.model.Id;
import lombok.*;

import java.util.*;

@RequiredArgsConstructor
@Getter
public class ImapMessage extends ImapEvent<Message> {
  private final Map<String, List<String>> mailHeaders;
  private final Id<Imap> imapAccountId;
  private final Message message;

  @Override
  public Message getPayload() {
    return message;
  }
}
