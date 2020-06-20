package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.model.Id;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.MessageChannel;

import javax.annotation.PostConstruct;
import javax.mail.*;
import javax.mail.event.*;

@RequiredArgsConstructor
public class FolderObserver implements
    AutoCloseable,
    ConnectionListener,
    MessageChangedListener,
    MessageCountListener {
  private final Folder folder;
  private final MessageChannel imapEventChannel;
  private final Id<Imap> imapAccountId;

  @PostConstruct
  void init() {
    folder.addConnectionListener(this);
    folder.addMessageChangedListener(this);
    folder.addMessageCountListener(this);
  }

  @Override
  public void opened(ConnectionEvent e) {

  }

  @Override
  public void disconnected(ConnectionEvent e) {

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
