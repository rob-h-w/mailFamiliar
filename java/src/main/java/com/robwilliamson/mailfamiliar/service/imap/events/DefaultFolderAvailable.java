package com.robwilliamson.mailfamiliar.service.imap.events;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.model.Id;
import lombok.*;

import javax.mail.Folder;

@RequiredArgsConstructor
@Getter
public class DefaultFolderAvailable extends ImapEvent<Folder> {
  private final Folder folder;
  private final Id<Imap> imapAccountId;

  @Override
  public Folder getPayload() {
    return folder;
  }
}
