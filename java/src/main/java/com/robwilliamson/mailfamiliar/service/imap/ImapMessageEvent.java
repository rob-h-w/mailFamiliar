package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.model.Id;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.MessageHeaders;

import javax.mail.Message;

import static com.robwilliamson.mailfamiliar.service.imap.ImapEvent.headers;

@RequiredArgsConstructor
public class ImapMessageEvent implements org.springframework.messaging.Message<Message> {
  private final Id<Imap> imapAccountId;
  private final Message message;

  @Override
  public Message getPayload() {
    return message;
  }

  @Override
  public MessageHeaders getHeaders() {
    return headers(imapAccountId);
  }
}
