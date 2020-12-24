package com.robwilliamson.mailfamiliar.service;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.repository.MailboxRepository;
import com.robwilliamson.mailfamiliar.service.imap.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Lookup;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import javax.transaction.Transactional;
import java.util.*;
import java.util.stream.Stream;

import static java.util.stream.Collectors.toList;

@RequiredArgsConstructor
@Service
public abstract class ImapSyncService {
  final Map<Integer, Synchronizer> synchronizers = new HashMap<>();
  private final AccountProvider accountProvider;
  private final MailboxRepository mailboxRepository;
  private final TaskExecutor taskExecutor;

  @PostConstruct
  public void initialize() {
    discoverAccounts();
  }

  void discoverAccounts() {
    final var accounts = accountProvider.getAccounts().collect(toList());
    taskExecutor.execute(() -> accounts.forEach(this::addAccount));
  }

  ////
  // For testing.
  int synchronizerCount() {
    return synchronizers.size();
  }

  void reset() {
    synchronizers.values().forEach(Synchronizer::close);
    synchronizers.clear();
  }
  ////

  public void onNewAccount(Imap imapAccount) {
    addAccount(imapAccount);
  }

  @Transactional
  public void onAccountRemoved(Imap imapAccount) {
    removeAccount(imapAccount.getId());
  }

  @Transactional
  public void handleAccountMissing(ImapAccountMissingException e) {
    removeAccount(e.getImapAccountId().getValue());
  }

  private void removeAccount(int imapAccountId) {
    Optional.ofNullable(synchronizers.get(imapAccountId))
        .ifPresent(Synchronizer::close);
    mailboxRepository.deleteByImapAccountId(imapAccountId);
    synchronizers.remove(imapAccountId);
  }

  @Lookup
  public abstract Synchronizer getSynchronizer(Imap imap, TaskExecutor taskExecutor);

  public Synchronizer getSynchronizer(Imap imap) {
    return getSynchronizer(imap, taskExecutor);
  }

  private void addAccount(Imap imapAccount) {
    final int id = imapAccount.getId();
    if (synchronizers.containsKey(id)) {
      throw new DuplicateAccountCreatedException(id);
    }
    final Synchronizer synchronizer;
    synchronizer = getSynchronizer(imapAccount);
    taskExecutor.execute(synchronizer);
    synchronizers.put(id, synchronizer);
  }

  public Stream<Mailbox> mailboxenFor(int imapAccountId) {
    return mailboxRepository.findByImapAccountId(imapAccountId)
        .stream();
  }

  public Optional<Synchronizer> synchronizerFor(Id<Imap> imapId) {
    return Optional.ofNullable(synchronizers.get(imapId.getValue()));
  }

  public Synchronizer getSynchronizer(Id<Imap> imapId) throws ImapAccountMissingException {
    return synchronizerFor(imapId)
        .orElseThrow(() -> new ImapAccountMissingException(imapId));
  }
}
