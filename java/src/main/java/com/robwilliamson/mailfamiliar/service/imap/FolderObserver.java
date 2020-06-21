package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.model.Id;
import lombok.extern.log4j.Log4j2;
import org.springframework.messaging.MessageChannel;

import javax.mail.*;
import javax.mail.event.*;

@Log4j2
public class FolderObserver implements
    AutoCloseable,
    ConnectionListener,
    MessageChangedListener,
    MessageCountListener {
  private final Folder folder;
  private final Id<Imap> imapAccountId;
  private final MessageChannel imapEventChannel;

  FolderObserver(Folder folder, Id<Imap> imapAccountId, MessageChannel imapEventChannel) {
    this.folder = folder;
    this.imapAccountId = imapAccountId;
    this.imapEventChannel = imapEventChannel;
    folder.addConnectionListener(this);
    folder.addMessageChangedListener(this);
    folder.addMessageCountListener(this);
  }

  @Override
  public void opened(ConnectionEvent e) {
    log.info(e);
  }

  @Override
  public void disconnected(ConnectionEvent e) {
    log.info(e);
  }

  @Override
  public void closed(ConnectionEvent e) {

  }

  @Override
  public void messageChanged(MessageChangedEvent e) {

  }

  @Override
  public void messagesAdded(MessageCountEvent e) {

  }

  @Override
  public void messagesRemoved(MessageCountEvent e) {

  }

  @Override
  public void close() throws MessagingException {
    folder.removeConnectionListener(this);
    folder.removeMessageChangedListener(this);
    folder.removeMessageCountListener(this);

    if (folder.isOpen()) {
      folder.close();
    }
  }
}
