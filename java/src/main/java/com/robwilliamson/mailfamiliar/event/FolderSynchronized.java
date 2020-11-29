package com.robwilliamson.mailfamiliar.event;

import com.robwilliamson.mailfamiliar.entity.Mailbox;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class FolderSynchronized extends ApplicationEvent {
  private final Mailbox mailbox;

  public FolderSynchronized(Object source, Mailbox mailbox) {
    super(source);
    this.mailbox = mailbox;
  }
}
