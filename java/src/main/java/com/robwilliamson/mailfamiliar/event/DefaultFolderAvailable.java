package com.robwilliamson.mailfamiliar.event;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.model.Id;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import javax.mail.Folder;

@Getter
public class DefaultFolderAvailable extends ApplicationEvent {
  private final Folder folder;
  private final Id<Imap> imapAccountId;

  public DefaultFolderAvailable(Object source, Folder folder, Id<Imap> imapAccountId) {
    super(source);
    this.folder = folder;
    this.imapAccountId = imapAccountId;
  }
}
