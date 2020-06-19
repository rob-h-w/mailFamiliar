package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.model.Id;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.*;

import javax.mail.Folder;

import static com.robwilliamson.mailfamiliar.service.imap.ImapEvent.headers;

@RequiredArgsConstructor
public class DefaultFolderOpenedEvent implements Message<Folder> {
  private final Folder folder;
  private final Id<Imap> imapAccountId;

  @Override
  public Folder getPayload() {
    return folder;
  }

  @Override
  public MessageHeaders getHeaders() {
    return headers(imapAccountId);
  }
}
