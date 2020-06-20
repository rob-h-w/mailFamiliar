package com.robwilliamson.mailfamiliar.service.imap.events;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.model.Id;
import lombok.*;

import javax.mail.Message;

@RequiredArgsConstructor
@Getter
public class ImapMessage extends ImapEvent<Message> {
  private final Id<Imap> imapAccountId;
  private final Message message;

  @Override
  public Message getPayload() {
    return message;
  }
}
