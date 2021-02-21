package com.robwilliamson.mailfamiliar.events;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.service.imap.ImapHeaders;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class ImapMessageDeleted extends ApplicationEvent {
  private final ImapHeaders imapHeaders;
  private final Id<Imap> imapId;
  private final Message messageEntity;

  public ImapMessageDeleted(Object source, Id<Imap> imapId, ImapHeaders imapHeaders, Message messageEntity) {
    super(source);
    this.imapHeaders = imapHeaders;
    this.imapId = imapId;
    this.messageEntity = messageEntity;
  }
}
