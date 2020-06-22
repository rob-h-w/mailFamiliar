package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.repository.MailboxRepository;
import com.robwilliamson.mailfamiliar.service.CryptoService;
import com.robwilliamson.mailfamiliar.service.imap.events.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.messaging.MessageChannel;

import javax.annotation.PostConstruct;
import javax.mail.*;
import javax.mail.event.*;
import java.util.*;
import java.util.concurrent.locks.*;
import java.util.stream.Stream;

import static com.robwilliamson.mailfamiliar.service.imap.FolderMethods.*;
import static javax.mail.Folder.READ_WRITE;

@Log4j2
@RequiredArgsConstructor
public class Synchronizer implements
    AutoCloseable,
    FolderListener,
    Runnable, StoreListener {
  private final CryptoService cryptoService;
  private final Imap imap;
  private final MailboxRepository mailboxRepository;
  private final MessageChannel imapEventChannel;
  private final Lock lock = new ReentrantLock();
  private final Map<Folder, FolderObserver> folderObervers = new HashMap<>();
  private Id<Imap> imapAccountId;
  private volatile boolean closing = false;

  @PostConstruct
  void init() {
    imapAccountId = Id.of(imap.getId(), Imap.class);
  }

  @Override
  public void run() {
    final String password;

    try {
      password = cryptoService.decrypt(
          Id.of(imap.getUserId(), User.class),
          Id.of(imap.getPassword(), Encrypted.class));
    } catch (MissingSecretException | MissingUserException e) {
      imapEventChannel.send(new SynchronizerException(
          imapAccountId,
          SynchronizerException.Reason.ProgrammerError,
          Optional.of(e)));
      throw new RuntimeException(e);
    }

    final Properties properties = new Properties();
    properties.put("mail.imap.user", imap.getName());
    properties.put("mail.imap.port", imap.getPort());
    properties.put("mail.host", imap.getHost());
    properties.put("mail.imap.peek", true);
    if (imap.isTls()) {
      properties.put("mail.imap.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
    }

    final Session session = Session.getInstance(
        properties,
        new Authenticator() {
          @Override
          protected PasswordAuthentication getPasswordAuthentication() {
            return new PasswordAuthentication(imap.getName(), password);
          }
        });

    try (Store store = session.getStore("imap")) {
      store.connect();
      store.addFolderListener(this);
      store.addStoreListener(this);
      final Folder defaultFolder = store.getDefaultFolder();
      defaultFolder.addFolderListener(this);
      imapEventChannel.send(new DefaultFolderAvailable(defaultFolder, imapAccountId));
      sync(defaultFolder);
    } catch (MessagingException e) {
      imapEventChannel.send(SynchronizerException
          .builder(imapAccountId)
          .throwable(e)
          .build());
    } catch (InterruptedException e) {
      imapEventChannel.send(SynchronizerException
          .builder(imapAccountId)
          .closedIntentionally()
          .build());
    }
  }

  private void add(Folder folder) {
    lock.lock();
    try {
      if (closing || !isStorable(folder)) {
        return;
      }

      final Optional<Mailbox> optionalMailbox = mailboxRepository.findByNameAndImapAccountId(
          fullyQualifiedName(folder),
          imapAccountId.getValue());
      if (optionalMailbox.isEmpty()) {
        mailboxRepository.save(createMailbox(folder, imapAccountId));
      }
      folder.open(READ_WRITE);
      folderObervers.put(
          folder,
          new FolderObserver(folder, imapAccountId, imapEventChannel));
    } catch (MessagingException e) {
      imapEventChannel.send(new SynchronizerException(imapAccountId,
          SynchronizerException.Reason.OpenError, Optional.of(e)));
    } finally {
      lock.unlock();
    }
  }

  private void sync(Folder folder) throws MessagingException, InterruptedException {
    if (closing) {
      throw new InterruptedException();
    }

    for (Folder f : folder.list()) {
      sync(f);
    }

    if (isStorable(folder)) {
      add(folder);
      Stream.of(folder.getMessages())
          .forEach(message -> imapEventChannel.send(new ImapMessage(
              imapAccountId,
              message)));
    }
  }

  @Override
  public void close() {
    closing = true;
    lock.lock();
    final var folders = new ArrayList<>(folderObervers.keySet());
    try {
      for (Folder folder : folders) {
        remove(folder);
      }
    } finally {
      lock.unlock();
    }
  }

  @Override
  public void folderCreated(FolderEvent e) {
    lock.lock();
    try {
      if (closing) {
        return;
      }
      add(e.getNewFolder());
    } finally {
      lock.unlock();
    }
  }

  @Override
  public void folderDeleted(FolderEvent e) {
    if (closing) {
      return;
    }
    lock.lock();
    try {
      if (closing) {
        return;
      }
      remove(e.getFolder());
    } finally {
      lock.unlock();
    }
  }

  private void remove(Folder folder) {
    lock.lock();
    try {
      if (!folderObervers.containsKey(folder)) {
        return;
      }

      final FolderObserver observer = folderObervers.remove(folder);
      observer.close();
    } catch (MessagingException e) {
      imapEventChannel.send(SynchronizerException
          .builder(imapAccountId)
          .reason(SynchronizerException.Reason.CloseError)
          .throwable(e)
          .build());
    } finally {
      lock.unlock();
    }
  }

  @Override
  public void folderRenamed(FolderEvent e) {
    log.info(e);
    try {
      if (!isStorable(e.getFolder())) {
        return;
      }

      final var optionalMailbox = mailboxRepository.findByNameAndImapAccountId(
          fullyQualifiedName(e.getFolder()),
          imapAccountId.getValue());
      final var mailbox = optionalMailbox.orElse(createMailbox(e.getNewFolder(), imapAccountId));
      mailbox.setName(fullyQualifiedName(e.getNewFolder()));
      mailboxRepository.save(mailbox);
    } catch (MessagingException messagingException) {
      imapEventChannel.send(SynchronizerException
          .builder(imapAccountId)
          .throwable(messagingException)
          .build());
    }
  }

  @Override
  public void notification(StoreEvent e) {
    log.info(e);
  }
}
