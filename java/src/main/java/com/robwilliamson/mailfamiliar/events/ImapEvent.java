package com.robwilliamson.mailfamiliar.events;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.model.Id;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public abstract class ImapEvent extends ApplicationEvent {
  private final Id<Imap> imapAccountId;

  public ImapEvent(Object source, Id<Imap> imapAccountId) {
    super(source);
    this.imapAccountId = imapAccountId;
  }
}
