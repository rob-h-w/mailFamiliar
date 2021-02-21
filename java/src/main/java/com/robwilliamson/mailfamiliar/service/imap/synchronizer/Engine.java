package com.robwilliamson.mailfamiliar.service.imap.synchronizer;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.exceptions.FromMissingException;
import com.robwilliamson.mailfamiliar.repository.SyncRepository;
import com.robwilliamson.mailfamiliar.service.imap.FolderObserver;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import javax.mail.*;
import javax.transaction.Transactional;
import java.util.*;

@Component
@RequiredArgsConstructor
public class Engine {
  private static final long MILLIS_IN_DAY = 1000 * 60 * 60 * 24;
  private final SyncRepository syncRepository;

  @Transactional
  public void syncMessages(
      Folder folder,
      Mailbox mailbox,
      Imap imap,
      Map<Folder, FolderObserver> folderObervers,
      ApplicationEventPublisher eventPublisher) throws
      MessagingException,
      FromMissingException {
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
    eventPublisher.publishEvent(new com.robwilliamson.mailfamiliar.events.FolderSynchronized(
        this,
        mailbox));
  }
}
