package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.config.ImapSync;
import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.events.*;
import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.repository.MailboxRepository;
import com.robwilliamson.mailfamiliar.service.imap.synchronizer.Engine;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.task.TaskExecutor;

import javax.annotation.PostConstruct;
import javax.mail.Message;
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
  private final Engine engine;
  private final ApplicationEventPublisher eventPublisher;
  private final Imap imap;
  private final ImapSync imapSync;
  private final MailboxRepository mailboxRepository;
  private final StoreFactory storeFactory;
  private final StoreSettingsProvider storeSettingsProvider;
  private final Lock folderLock = new ReentrantLock();
  private final Condition closed = folderLock.newCondition();
  private final Lock inconsistencyLock = new ReentrantLock();
  private final Map<Folder, FolderObserver> folderObervers = new HashMap<>();
  private final Map<String, Folder> foldersByName = new HashMap<>();
  private final TaskExecutor taskExecutor;
  private Id<Imap> imapAccountId;
  private volatile boolean closing = false;

  @PersistenceContext
  private EntityManager entityManager;

  @PostConstruct
  void init() {
    imapAccountId = Id.of(imap.getId(), Imap.class);
    taskExecutor.execute(this);
  }

  @Override
  public void run() {
    SynchronizerException.tryAndPublish(
        new SynchronizerException.SyncJob() {
          @Override
          public boolean closing() {
            return closing;
          }

          @Override
          public Id<Imap> imapAccountId() {
            return imapAccountId;
          }

          @Override
          public Object parent() {
            return Synchronizer.this;
          }

          @Override
          public void run() throws MessagingException, FromMissingException, InterruptedException {
            try (Store store = storeFactory.getInstance(
                storeSettingsProvider.getPropertiesFor(imap),
                storeSettingsProvider.getAuthenticatorFor(imap))) {
              store.connect();
              store.addFolderListener(Synchronizer.this);
              store.addStoreListener(Synchronizer.this);
              final Folder defaultFolder = store.getDefaultFolder();
              defaultFolder.addFolderListener(Synchronizer.this);
              eventPublisher.publishEvent(new DefaultFolderAvailable(
                  this,
                  imapAccountId,
                  defaultFolder));
              while (!closing) {
                sync(defaultFolder);
                folderLock.lock();
                try {
                  closed.await(imap.getRefreshPeriodMinutes(), TimeUnit.MINUTES);
                } finally {
                  folderLock.unlock();
                }
              }
            }
          }
        },
        eventPublisher);

  }

  private Mailbox add(Folder folder) throws MessagingException, InterruptedException {
    folderLock.lock();
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
      foldersByName.put(fullyQualifiedName(folder), folder);
      return mailbox;
    } catch (MessagingException e) {
      folderObervers.remove(folder);
      eventPublisher.publishEvent(new SynchronizerException(
          this,
          imapAccountId,
          SynchronizerException.Reason.OpenError,
          Optional.of(e)));
      throw e;
    } finally {
      folderLock.unlock();
    }
  }

  private void sync(Folder folder) throws MessagingException, InterruptedException, FromMissingException {
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

  private void syncMessages(Folder folder, Mailbox add) throws FromMissingException, MessagingException {
    folderLock.lock();
    try {
      engine.syncMessages(folder, add, imap, folderObervers, eventPublisher);
    } finally {
      folderLock.unlock();
    }
  }

  @Override
  public void close() {
    closing = true;
    folderLock.lock();
    final var folders = new ArrayList<>(folderObervers.keySet());
    try {
      for (Folder folder : folders) {
        close(folder);
      }
      closed.signal();
    } finally {
      foldersByName.clear();
      folderLock.unlock();
    }
  }

  @Override
  @Transactional
  public void folderCreated(FolderEvent e) {
    folderLock.lock();
    try {
      if (closing) {
        return;
      }
      sync(e.getNewFolder());
    } catch (
        InterruptedException
            | MessagingException
            | FromMissingException interruptedException) {
      eventPublisher.publishEvent(SynchronizerException
          .builder(this, imapAccountId)
          .throwable(interruptedException)
          .build());
    } finally {
      folderLock.unlock();
    }
  }

  @Override
  @Transactional
  public void folderDeleted(FolderEvent e) {
    if (closing) {
      return;
    }
    folderLock.lock();
    try {
      if (closing) {
        return;
      }
      remove(e.getFolder());
    } finally {
      folderLock.unlock();
    }
  }

  private void close(Folder folder) {
    folderLock.lock();
    try {
      final FolderObserver observer = folderObervers.remove(folder);
      observer.close();
      foldersByName.remove(fullyQualifiedName(folder));
    } catch (MessagingException e) {
      eventPublisher.publishEvent(SynchronizerException
          .builder(this, imapAccountId)
          .reason(SynchronizerException.Reason.CloseError)
          .throwable(e)
          .build());
    } finally {
      folderLock.unlock();
    }
  }

  private void remove(Folder folder) {
    folderLock.lock();
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
        eventPublisher.publishEvent(new FolderRemoved(this, mailbox));
      }
      close(folder);
    } catch (MessagingException e) {
      eventPublisher.publishEvent(SynchronizerException
          .builder(this, imapAccountId)
          .throwable(e)
          .build());
    } finally {
      folderLock.unlock();
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
      eventPublisher.publishEvent(SynchronizerException
          .builder(this, imapAccountId)
          .throwable(messagingException)
          .build());
    }
  }

  @Override
  public void notification(StoreEvent e) {
    log.info(e.getMessage());
  }

  public Optional<Folder> folderFor(Mailbox mailbox) {
    return Optional.ofNullable(foldersByName.get(mailbox.getName()));
  }

  public Folder getFolder(Mailbox mailbox) throws FolderMissingException {
    return folderFor(mailbox)
        .orElseThrow(() -> new FolderMissingException(mailbox));
  }

  @Transactional
  public void handleFolderMissing(FolderMissingException e) {
    // TODO
  }

  @Transactional
  public void handleMessageMissing(MessageNotFoundException e) {
    // TODO
  }

  public void handleMultipleMessages(MultipleMessagesFoundException e) {
    inconsistencyLock.lock();
    try {
      for (Message message : e.getExcess()) {
        message.setFlag(Flags.Flag.DELETED, true);
      }
    } catch (MessagingException messagingException) {
      log.warn("Could not clean up excess messages.", messagingException);
    } finally {
      inconsistencyLock.unlock();
    }
  }
}
