package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.config.ImapSync;
import com.robwilliamson.mailfamiliar.entity.Message;
import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.repository.*;
import com.robwilliamson.mailfamiliar.service.CryptoService;
import com.robwilliamson.mailfamiliar.service.imap.events.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.messaging.MessageChannel;

import javax.annotation.PostConstruct;
import javax.mail.*;
import javax.mail.event.*;
import javax.persistence.*;
import javax.transaction.Transactional;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.*;

import static com.robwilliamson.mailfamiliar.service.imap.FolderMethods.*;
import static javax.mail.Folder.READ_WRITE;

@Log4j2
@RequiredArgsConstructor
public class Synchronizer implements
    AutoCloseable,
    FolderListener,
    Runnable, StoreListener {
  private static final long MILLIS_IN_DAY = 1000 * 60 * 60 * 24;
  private final CryptoService cryptoService;
  private final Imap imap;
  private final ImapSync imapSync;
  private final MessageChannel imapEventChannel;
  private final MailboxRepository mailboxRepository;
  private final StoreFactory storeFactory;
  private final SyncRepository syncRepository;
  private final Lock lock = new ReentrantLock();
  private final Condition closed = lock.newCondition();
  private final Map<Folder, FolderObserver> folderObervers = new HashMap<>();
  private Id<Imap> imapAccountId;
  private volatile boolean closing = false;

  @PersistenceContext
  private EntityManager entityManager;

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

    try (Store store = storeFactory.getInstance(
        properties,
        new Authenticator() {
          @Override
          protected PasswordAuthentication getPasswordAuthentication() {
            return new PasswordAuthentication(imap.getName(), password);
          }
        })) {
      store.connect();
      store.addFolderListener(this);
      store.addStoreListener(this);
      final Folder defaultFolder = store.getDefaultFolder();
      defaultFolder.addFolderListener(this);
      imapEventChannel.send(new DefaultFolderAvailable(defaultFolder, imapAccountId));
      while (!closing) {
        sync(defaultFolder);
        lock.lock();
        try {
          closed.await(imap.getRefreshPeriodMinutes(), TimeUnit.MINUTES);
        } finally {
          lock.unlock();
        }
      }
    } catch (MessagingException | Message.FromMissingException e) {
      imapEventChannel.send(SynchronizerException
          .builder(imapAccountId)
          .throwable(e)
          .reason(SynchronizerException.Reason.ClosedUnexpectedly)
          .build());
    } catch (InterruptedException e) {
      if (closing) {
        imapEventChannel.send(SynchronizerException
            .builder(imapAccountId)
            .throwable(e)
            .reason(SynchronizerException.Reason.ClosedUnexpectedly)
            .build());
      } else {
        imapEventChannel.send(SynchronizerException
            .builder(imapAccountId)
            .closedIntentionally()
            .build());
      }
    } catch (Throwable e) {
      imapEventChannel.send(SynchronizerException
          .builder(imapAccountId)
          .throwable(e)
          .build());
      throw e;
    }
  }

  private Mailbox add(Folder folder) throws MessagingException, InterruptedException {
    lock.lock();
    try {
      if (closing || !isStorable(folder)) {
        throw new InterruptedException();
      }

      final Optional<Mailbox> optionalMailbox = mailboxRepository.findByNameAndImapAccountId(
          fullyQualifiedName(folder),
          imapAccountId.getValue());
      final Mailbox mailbox;
      if (optionalMailbox.isEmpty()) {
        mailbox = mailboxRepository.save(createMailbox(folder, imapAccountId));
      } else {
        mailbox = optionalMailbox.get();
      }
      folder.open(READ_WRITE);
      folderObervers.put(
          folder,
          imapSync.createFolderObserver(folder, mailbox));
      return mailbox;
    } catch (MessagingException e) {
      imapEventChannel.send(new SynchronizerException(imapAccountId,
          SynchronizerException.Reason.OpenError, Optional.of(e)));
      throw e;
    } finally {
      lock.unlock();
    }
  }

  private void sync(Folder folder) throws MessagingException, InterruptedException, Message.FromMissingException {
    if (closing) {
      throw new InterruptedException();
    }

    for (Folder f : folder.list()) {
      sync(f);
    }

    if (isStorable(folder)) {
      syncMessages(folder, add(folder));
    }
  }

  @Transactional
  void syncMessages(Folder folder, Mailbox mailbox) throws
      MessagingException,
      Message.FromMissingException {
    final Optional<Sync> syncRecord = syncRepository.findByMailboxId(mailbox.getId());
    final Date limit;
    if (syncRecord.isPresent()) {
      limit = syncRecord.get().lastSynced();
    } else {
      limit = new Date(System.currentTimeMillis() - imap.getSyncPeriodDays() * MILLIS_IN_DAY);
    }

    final Date lastSynced = folderObervers.get(folder).syncMessages(folder, limit);

    final Sync updatedRecord = syncRecord.orElse(new Sync());
    updatedRecord.setLastSynced(lastSynced);
    updatedRecord.setMailboxId(mailbox.getId());
    syncRepository.save(updatedRecord);
    imapEventChannel.send(new FolderSynchronized(mailbox));
  }

  @Override
  public void close() {
    closing = true;
    lock.lock();
    final var folders = new ArrayList<>(folderObervers.keySet());
    try {
      for (Folder folder : folders) {
        close(folder);
      }
      closed.signal();
    } finally {
      lock.unlock();
    }
  }

  private void close(Folder folder) {
    lock.lock();
    try {
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
  @Transactional
  public void folderCreated(FolderEvent e) {
    lock.lock();
    try {
      if (closing) {
        return;
      }
      sync(e.getNewFolder());
    } catch (
        InterruptedException
            | MessagingException
            | Message.FromMissingException interruptedException) {
      imapEventChannel.send(SynchronizerException
          .builder(imapAccountId)
          .throwable(interruptedException)
          .build());
    } finally {
      lock.unlock();
    }
  }

  @Override
  @Transactional
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

      final Optional<Mailbox> optionalMailbox = mailboxRepository.findByNameAndImapAccountId(
          fullyQualifiedName(folder),
          imapAccountId.getValue());
      if (optionalMailbox.isPresent()) {
        final var mailbox = optionalMailbox.get();
        entityManager
            .createQuery("delete from Header where messageId in (" +
                "select id from Message where mailboxId = :mailboxId)")
            .setParameter("mailboxId", mailbox.getId())
            .executeUpdate();
        entityManager.createQuery("delete from Message where id = :mailboxId")
            .setParameter("mailboxId", mailbox.getId())
            .executeUpdate();
        mailboxRepository.delete(mailbox);
        imapEventChannel.send(new FolderRemoved(mailbox));
      }
      close(folder);
    } catch (MessagingException e) {
      imapEventChannel.send(SynchronizerException
          .builder(imapAccountId)
          .throwable(e)
          .build());
    } finally {
      lock.unlock();
    }
  }

  @Override
  @Transactional
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
    log.info(e.getMessage());
  }
}
