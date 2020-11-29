package com.robwilliamson.mailfamiliar.event;

import com.robwilliamson.mailfamiliar.entity.Mailbox;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class FolderRemoved extends ApplicationEvent {
  private final Mailbox mailbox;

  public FolderRemoved(Object source, Mailbox mailbox) {
    super(source);
    this.mailbox = mailbox;
  }
}
