package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.model.Id;
import lombok.Data;
import org.springframework.messaging.MessageHeaders;

import javax.mail.Message;
import java.util.Map;

@Data
public class ImapEvent implements org.springframework.messaging.Message<Message> {
  private final Id<Imap> imapAccountId;
  private final Message message;
  private final Id<User> userId;

  @Override
  public Message getPayload() {
    return message;
  }

  @Override
  public MessageHeaders getHeaders() {
    return new MessageHeaders(Map.of(
        "imapAccountId", imapAccountId,
        "userId", userId
    ));
  }
}
