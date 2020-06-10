package com.robwilliamson.mailfamiliar.service;

import com.robwilliamson.mailfamiliar.exceptions.DuplicateAccountCreatedException;
import com.robwilliamson.mailfamiliar.model.*;
import com.robwilliamson.mailfamiliar.repository.MailboxRepository;
import com.robwilliamson.mailfamiliar.service.imap.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Stream;

import static com.robwilliamson.mailfamiliar.CopyProperties.copy;

@Service
public class ImapSyncService {
  final Map<Integer, Synchronizer> synchronizers = new HashMap<>();
  private final AccountProvider accountProvider;
  private final MailboxRepository mailboxRepository;
  private final SynchronizerFactory synchronizerFactory;
  private final TaskExecutor taskExecutor;

  public ImapSyncService(
      AccountProvider accountProvider,
      MailboxRepository mailboxRepository,
      SynchronizerFactory synchronizerFactory,
      @Qualifier("taskExecutor") TaskExecutor taskExecutor) {
    this.accountProvider = accountProvider;
    this.mailboxRepository = mailboxRepository;
    this.synchronizerFactory = synchronizerFactory;
    this.taskExecutor = taskExecutor;
    taskExecutor.execute(this::initialize);
  }

  public void onNewAccount(Imap account) {
    addAccount(account);
  }

  public synchronized void onAccountRemoved(Imap account) {
    synchronizers.remove(account.getId());
  }

  private void initialize() {
    accountProvider.getAccounts().forEach(this::addAccount);
  }

  private synchronized void addAccount(Imap imapAccount) {
    final int id = imapAccount.getId();
    if (synchronizers.containsKey(id)) {
      throw new DuplicateAccountCreatedException(id);
    }
    final Synchronizer synchronizer = synchronizerFactory.apply(imapAccount);
    taskExecutor.execute(synchronizer);
    synchronizers.put(id, synchronizer);
  }

  public Stream<Mailbox> mailboxenFor(int imapAccountId) {
    return mailboxRepository.findByImapAccountId(imapAccountId)
        .stream()
        .map(entity -> copy(entity, new Mailbox()));
  }
}
