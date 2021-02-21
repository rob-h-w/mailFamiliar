package com.robwilliamson.mailfamiliar.service.move;

import com.robwilliamson.mailfamiliar.entity.Message;
import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.repository.*;
import com.robwilliamson.mailfamiliar.service.ImapSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.stereotype.Component;

import javax.mail.*;
import javax.transaction.Transactional;
import java.util.*;
import java.util.concurrent.ConcurrentLinkedDeque;

@Component
@Log4j2
@RequiredArgsConstructor
public class Mover {
  private static final Collection<MoveState.State> STATES = List.of(
      MoveState.State.Recorded,
      MoveState.State.Copied,
      MoveState.State.DeleteFlagged
  );
  private final ImapSyncService imapSyncService;
  private final MailboxRepository mailboxRepository;
  private final MoveStateRepository moveStateRepository;

  @Transactional
  public boolean checkForMoves() throws InterruptedException {
    final Deque<MoveState> pendingMoves = new ConcurrentLinkedDeque<>(
        moveStateRepository.findAllByStateIn(STATES));

    if (pendingMoves.isEmpty()) {
      return false;
    }

    while (!pendingMoves.isEmpty()) {
      handleMoveState(pendingMoves.pop());
    }

    return true;
  }

  @Transactional
  public MoveState saveMove(Message message, Mailbox to) throws FolderRecordMissingException {
    return moveStateRepository.save(MoveState.builder()
        .from(mailboxRepository.getById(message.getMailboxId()))
        .message(message)
        .state(MoveState.State.Recorded)
        .to(to)
        .build());
  }

  @Transactional
  public void handleMoveState(MoveState savedState) throws InterruptedException {
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
      }
    } catch (ImapAccountMissingException e) {
      imapSyncService.handleAccountMissing(e);
      moveStateRepository.delete(savedState);
    } catch (FromMissingException e) {
      log.error("This should not be possible.", e);
      moveStateRepository.delete(savedState);
    } catch (MessagingException e) {
      // Retry later.
    }
  }

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

    moveStateRepository.save(moveState.withState(MoveState.State.Copied));
  }

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
      moveStateRepository.save(moveState.withState(MoveState.State.Recorded));
      return;
    }

    if (messageInFrom.isEmpty()) {
      // The message is in the destination, but not in source. The move is complete.
      moveStateRepository.save(moveState.withState(MoveState.State.Done));
      return;
    }

    // Mark the old message deleted;
    messageInFrom.get().setFlag(Flags.Flag.DELETED, true);
    moveStateRepository.save(moveState.withState(MoveState.State.DeleteFlagged));
  }

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
      moveStateRepository.save(moveState.withState(MoveState.State.Copied));
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
}
