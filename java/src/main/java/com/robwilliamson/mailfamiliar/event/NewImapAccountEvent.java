package com.robwilliamson.mailfamiliar.event;

import com.robwilliamson.mailfamiliar.entity.Imap;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class NewImapAccountEvent extends ApplicationEvent {
  private final Imap imap;

  public NewImapAccountEvent(Object source, Imap imap) {
    super(source);

    this.imap = imap;
  }
}
