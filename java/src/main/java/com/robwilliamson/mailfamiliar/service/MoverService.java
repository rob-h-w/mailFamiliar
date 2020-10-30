package com.robwilliamson.mailfamiliar.service;

import com.robwilliamson.mailfamiliar.entity.Message;
import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import javax.mail.*;
import javax.transaction.Transactional;
import java.util.*;
import java.util.concurrent.locks.*;

@RequiredArgsConstructor
@Log4j2
@Service
public class MoverService implements Runnable {
  private static final Collection<MoveState.State> STATES = List.of(
      MoveState.State.Recorded,
      MoveState.State.Copied,
      MoveState.State.DeleteFlagged
  );
  private final ImapSyncService imapSyncService;
  private final Lock lock = new ReentrantLock();
  private final Condition moveAdded = lock.newCondition();
  private final MailboxRepository mailboxRepository;
  private final MoveStateRepository moveStateRepository;
  private final TaskExecutor taskExecutor;
  private final Set<MoveState> pendingMovesSet = new HashSet<>();
  private List<MoveState> pendingMoves = new LinkedList<>();

  @PostConstruct
  void init() {
    taskExecutor.execute(this);
  }

  private void checkForMoves() throws InterruptedException {
    lock.lock();
    try {
      addMoves(moveStateRepository.findAllByStateIn(STATES));
      while (!pendingMovesSet.isEmpty()) {
        final var savedState = pendingMoves.remove(0);
        pendingMovesSet.remove(savedState);
        handleMoveState(savedState);
      }
    } finally {
      lock.unlock();
    }
  }

  int pendingSize() {
    lock.lock();
    try {
      return pendingMoves.size();
    } finally {
      lock.unlock();
    }
  }

  @Transactional
  void handleMoveState(MoveState savedState) throws InterruptedException {
    if (Thread.interrupted()) {
      throw new InterruptedException();
    }
    try {
      try {
        switch (savedState.getState()) {
          case Recorded:
            onRecorded(savedState);
            break;
          case Copied:
            onCopied(savedState);
            break;
          case DeleteFlagged:
            onDeleteFlagged(savedState);
            break;
          case Done:
            break;
        }
      } catch (FolderMissingException e) {
        imapSyncService.getSynchronizer(savedState.getFrom().getImapAccountIdObject())
            .handleFolderMissing(e);
        moveStateRepository.delete(savedState);
      } catch (MultipleMessagesFoundException e) {
        imapSyncService.getSynchronizer(savedState.getFrom().getImapAccountIdObject())
            .handleMultipleMessages(e);
        // Can retry after this.
        addMove(savedState);
      }
    } catch (ImapAccountMissingException e) {
      imapSyncService.handleAccountMissing(e);
      moveStateRepository.delete(savedState);
    } catch (FromMissingException e) {
      log.error("This should not be possible.", e);
      moveStateRepository.delete(savedState);
    } catch (MessagingException e) {
      // Retry later.
      addMove(savedState);
    }
  }

  @Transactional
  void onRecorded(MoveState moveState) throws
      ImapAccountMissingException,
      FolderMissingException,
      FromMissingException,
      MessagingException,
      MultipleMessagesFoundException {
    try {
      final Folder fromFolder = getFolder(moveState.getFrom());
      final javax.mail.Message message = moveState.getMessage().getSelfIn(fromFolder);
      final Folder toFolder = getFolder(moveState.getTo());
      fromFolder.copyMessages(new javax.mail.Message[]{message}, toFolder);
    } catch (MessageNotFoundException e) {
      imapSyncService.getSynchronizer(moveState.getFrom().getImapAccountIdObject())
          .handleMessageMissing(e);
      moveStateRepository.delete(moveState);
      return;
    }
    addMove(moveStateRepository.save(moveState.withState(MoveState.State.Copied)));
  }

  @Transactional
  void onCopied(MoveState moveState) throws
      ImapAccountMissingException,
      FolderMissingException,
      MessagingException,
      MultipleMessagesFoundException,
      FromMissingException {
    final Folder fromFolder = getFolder(moveState.getFrom());
    final Folder toFolder = getFolder(moveState.getTo());
    // Check things are really copied.
    final Optional<javax.mail.Message> messageInFrom = moveState
        .getMessage()
        .findSelfIn(fromFolder);
    try {
      moveState.getMessage().getSelfIn(toFolder);
    } catch (MessageNotFoundException e) {
      if (messageInFrom.isEmpty()) {
        // Both to & from are missing, give up the move attempt.
        moveStateRepository.delete(moveState);
        return;
      }
      // Failed to copy. Try again.
      addMove(moveStateRepository.save(moveState.withState(MoveState.State.Recorded)));
      return;
    }

    if (messageInFrom.isEmpty()) {
      // The message is in the destination, but not in source. The move is complete.
      moveStateRepository.save(moveState.withState(MoveState.State.Done));
      return;
    }

    // Mark the old message deleted;
    messageInFrom.get().setFlag(Flags.Flag.DELETED, true);
    addMove(moveStateRepository.save(moveState.withState(MoveState.State.DeleteFlagged)));
  }

  @Transactional
  void onDeleteFlagged(MoveState moveState) throws
      ImapAccountMissingException,
      FolderMissingException,
      MessagingException,
      MultipleMessagesFoundException,
      FromMissingException {
    final Folder fromFolder = getFolder(moveState.getFrom());
    // Check the flag was set.
    final javax.mail.Message messageInFrom;
    try {
      messageInFrom = moveState.getMessage().getSelfIn(fromFolder);
    } catch (MessageNotFoundException e) {
      // Message was removed elsewhere. Ignore.
      moveStateRepository.delete(moveState);
      return;
    }
    if (!messageInFrom.getFlags().contains(Flags.Flag.DELETED)) {
      addMove(moveStateRepository.save(moveState.withState(MoveState.State.Copied)));
      return;
    }

    fromFolder.expunge();
    moveStateRepository.save(moveState.withState(MoveState.State.Done));
  }

  private Folder getFolder(Mailbox mailbox) throws
      FolderMissingException,
      ImapAccountMissingException {
    return imapSyncService.getSynchronizer(mailbox.getImapAccountIdObject())
        .getFolder(mailbox);
  }

  private void addMove(MoveState savedState) {
    addMoves(List.of(savedState));
  }

  private void addMoves(Collection<MoveState> savedStates) {
    lock.lock();
    try {
      pendingMovesSet.addAll(savedStates);
      pendingMoves = new LinkedList<>(pendingMovesSet);
      moveAdded.signal();
    } finally {
      lock.unlock();
    }
  }

  @Transactional
  public void move(Message message, Mailbox to) throws FolderRecordMissingException {
    addMove(moveStateRepository.save(MoveState.builder()
        .from(mailboxRepository.getById(message.getMailboxId()))
        .message(message)
        .state(MoveState.State.Recorded)
        .to(to)
        .build()));
  }

  @Override
  public void run() {
    while (true) {
      lock.lock();
      try {
        checkForMoves();
        moveAdded.await();
      } catch (InterruptedException e) {
        return;
      } finally {
        lock.unlock();
      }
    }
  }
}
