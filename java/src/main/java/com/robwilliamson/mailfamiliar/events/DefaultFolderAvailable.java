package com.robwilliamson.mailfamiliar.events;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.model.Id;
import lombok.Getter;

import javax.mail.Folder;

@Getter
public class DefaultFolderAvailable extends ImapEvent {
  private final Folder folder;

  public DefaultFolderAvailable(Object source, Id<Imap> imapAccountId, Folder folder) {
    super(source, imapAccountId);
    this.folder = folder;
  }
}
