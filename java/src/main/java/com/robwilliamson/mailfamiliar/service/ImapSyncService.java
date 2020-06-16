package com.robwilliamson.mailfamiliar.service;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.exceptions.DuplicateAccountCreatedException;
import com.robwilliamson.mailfamiliar.repository.MailboxRepository;
import com.robwilliamson.mailfamiliar.service.imap.*;
import lombok.RequiredArgsConstructor;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.util.*;
import java.util.stream.Stream;

@RequiredArgsConstructor
@Service
public class ImapSyncService {
  final Map<Integer, Synchronizer> synchronizers = new HashMap<>();
  private final AccountProvider accountProvider;
  private final MailboxRepository mailboxRepository;
  private final SynchronizerFactory synchronizerFactory;
  private final TaskExecutor taskExecutor;

  @PostConstruct
  public void initialize() {
    taskExecutor.execute(() -> accountProvider.getAccounts().forEach(this::addAccount));
  }

  public void onNewAccount(Imap imapAccount) {
    addAccount(imapAccount);
  }

  public synchronized void onAccountRemoved(Imap imapAccount) {
    final Synchronizer toRemove = synchronizers.remove(imapAccount.getId());
    if (toRemove == null) {
      return;
    }

    toRemove.close();
  }

  private synchronized void addAccount(Imap imapAccount) {
    final int id = imapAccount.getId();
    if (synchronizers.containsKey(id)) {
      throw new DuplicateAccountCreatedException(id);
    }
    final Synchronizer synchronizer;
    synchronizer = synchronizerFactory
        .create(
            imapAccount);
    taskExecutor.execute(synchronizer);
    synchronizers.put(id, synchronizer);
  }

  public Stream<Mailbox> mailboxenFor(int imapAccountId) {
    return mailboxRepository.findByImapAccountId(imapAccountId)
        .stream();
  }
}
