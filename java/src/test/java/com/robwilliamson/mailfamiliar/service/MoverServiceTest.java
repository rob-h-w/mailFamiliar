package com.robwilliamson.mailfamiliar.service;

import com.robwilliamson.mailfamiliar.config.ImapSync;
import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.repository.*;
import com.robwilliamson.mailfamiliar.service.imap.*;
import org.flywaydb.core.Flyway;
import org.flywaydb.test.annotation.FlywayTest;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.core.task.TaskExecutor;

import javax.mail.Message;
import javax.mail.*;
import javax.mail.event.MessageCountEvent;
import javax.mail.search.AndTerm;
import java.util.stream.Collectors;

import static com.robwilliamson.mailfamiliar.entity.MoveState.State.*;
import static com.robwilliamson.test.Data.mockMessage;
import static com.robwilliamson.test.Mock.countInvocations;
import static com.robwilliamson.test.Wait.until;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SpringBootTest("spring.datasource.tomcat.max-active=1")
class MoverServiceTest {
  @Autowired
  Flyway flyway;
  @Autowired
  ImapSync imapSync;
  @Autowired
  MailboxRepository mailboxRepository;
  @Autowired
  MessageRepository messageRepository;
  @Autowired
  MoveStateRepository moveStateRepository;
  @MockBean
  TaskExecutor taskExecutor;

  @MockBean
  ImapSyncService imapSyncService;

  @Mock
  Folder folder;
  @Mock
  Synchronizer mockSynchronizer;

  Message javaxMessage;
  Mailbox inbox;
  com.robwilliamson.mailfamiliar.entity.Message message;
  Mailbox spam;
  Thread runner;

  MoverService subject;

  @BeforeEach
  @FlywayTest
  public void setUp() throws MessagingException {
    flyway.migrate();
    inbox = mailboxRepository.save(Mailbox.builder()
        .imapAccountId(1)
        .name("inbox")
        .build());
    spam = mailboxRepository.save(Mailbox.builder()
        .imapAccountId(1)
        .name("spam")
        .build());
    final FolderObserver inboxObserver = imapSync.createFolderObserver(mock(Folder.class), inbox);
    javaxMessage = mockMessage("from@mail.com", "to@mail.com");
    inboxObserver.messagesAdded(
        new MessageCountEvent(
            mock(Folder.class),
            MessageCountEvent.ADDED,
            false,
            new Message[]{javaxMessage}));
    assertEquals(1, messageRepository.count());
    message = messageRepository.findAll().iterator().next();
    subject = new MoverService(
        imapSyncService,
        mailboxRepository,
        moveStateRepository,
        taskExecutor);
    subject.init();
    runner = new Thread(subject);
  }

  @AfterEach
  void tearDown() {
    reset(imapSyncService);
    reset(mockSynchronizer);
    flyway.clean();
  }

  @Nested
  class Move {
    @Nested
    class HappyPath {
      boolean wasDeleted;

      @BeforeEach
      public void setUp() throws
          FolderMissingException,
          ImapAccountMissingException,
          FolderRecordMissingException,
          InterruptedException,
          MessagingException {
        when(folder.search(any(AndTerm.class)))
            .thenReturn(new Message[]{javaxMessage});
        when(mockSynchronizer.getFolder(any()))
            .thenReturn(folder);
        when(imapSyncService.getSynchronizer(Id.of(1, Imap.class)))
            .thenReturn(mockSynchronizer);
        subject.move(message, spam);
        wasDeleted = false;
        doAnswer(answer -> {
          wasDeleted = true;
          return answer;
        })
            .when(javaxMessage)
            .setFlag(Flags.Flag.DELETED, true);
        var flags = mock(Flags.class);
        doAnswer(answer -> wasDeleted)
            .when(flags)
            .contains(Flags.Flag.DELETED);
        doReturn(flags)
            .when(javaxMessage)
            .getFlags();

        runner.start();
        until(() -> countInvocations(
            folder,
            "expunge",
            new Object[]{})
            > 0);
        until(() -> moveStateRepository.findAll().iterator().next().getState() != DeleteFlagged);
        runner.interrupt();
      }

      @Test
      public void createsAMoveStateRecord() {
        assertEquals(1, moveStateRepository.count());
      }

      @Test
      void savesTheCorrectState() {
        assertEquals(Done, moveStateRepository.findAll().iterator().next().getState());
      }
    }

    @Nested
    class WhenMessagingException {
      @BeforeEach
      public void setUp() throws
          FolderMissingException,
          ImapAccountMissingException,
          FolderRecordMissingException,
          InterruptedException,
          MessagingException {
        when(folder.search(any(AndTerm.class)))
            .thenThrow(new MessagingException());
        when(mockSynchronizer.getFolder(any()))
            .thenReturn(folder);
        when(imapSyncService.getSynchronizer(Id.of(1, Imap.class)))
            .thenReturn(mockSynchronizer);
        subject.move(message, spam);
        runner.start();
        until(() -> moveStateRepository.count() > 0);
        until(() -> countInvocations(
            mockSynchronizer,
            "getFolder",
            new Object[]{inbox})
            > 1);
        runner.interrupt();
      }

      @Test
      public void createsAMoveStateRecord() {
        assertEquals(1, moveStateRepository.count());
      }

      @Test
      public void moveStateIsRecorded() {
        assertEquals(Recorded, moveStateRepository.findAll().iterator().next().getState());
      }
    }

    @Nested
    class WhenMultipleMessagesFoundException {
      Message anotherMessage;

      @BeforeEach
      public void setUp() throws
          FolderMissingException,
          ImapAccountMissingException,
          FolderRecordMissingException,
          InterruptedException,
          MessagingException {
        anotherMessage = mockMessage("from_another@email.com", "to@mail.com");
        when(mockSynchronizer.getFolder(any()))
            .thenReturn(folder);
        when(imapSyncService.getSynchronizer(Id.of(1, Imap.class)))
            .thenReturn(mockSynchronizer);
        when(folder.search(any(AndTerm.class)))
            .thenReturn(new Message[]{
                javaxMessage,
                anotherMessage});
        subject.move(message, spam);
        until(() -> moveStateRepository.count() > 0);
        runner.start();
        until(() -> countInvocations(
            mockSynchronizer,
            "getFolder",
            new Object[]{inbox})
            > 1);
        runner.interrupt();
      }

      @Test
      public void createsAMoveStateRecord() {
        assertEquals(1, moveStateRepository.count());
      }

      @Test
      public void moveStateIsRecorded() {
        assertEquals(Recorded, moveStateRepository.findAll().iterator().next().getState());
      }

      @Test
      public void handlesTheMultiples() {
        verify(mockSynchronizer, atLeastOnce()).handleMultipleMessages(any());
      }
    }

    @Nested
    class WhenFromMissingException {
      @BeforeEach
      public void setUp() throws
          FolderMissingException,
          ImapAccountMissingException,
          FolderRecordMissingException,
          InterruptedException,
          MessagingException {
        messageRepository.deleteById(message.getId());
        message.setHeaders(message.getHeaders()
            .stream()
            .filter(header -> !"from".equals(header.getHeaderName().getName()))
            .collect(Collectors.toSet()));
        message = messageRepository.save(message);
        lenient().when(folder.search(any(AndTerm.class)))
            .thenReturn(new Message[]{javaxMessage});
        when(mockSynchronizer.getFolder(any()))
            .thenReturn(folder);
        when(imapSyncService.getSynchronizer(Id.of(1, Imap.class)))
            .thenReturn(mockSynchronizer);
        runner.start();
        subject.move(message, spam);
        until(() -> subject.pendingSize() == 0);
        runner.interrupt();
      }

      @Test
      public void deletesTheMoveStateRecord() {
        assertEquals(0, moveStateRepository.count());
      }
    }

    @Nested
    class WhenMessageNotFoundException {
      @BeforeEach
      public void setUp() throws
          FolderMissingException,
          ImapAccountMissingException,
          FolderRecordMissingException,
          InterruptedException, MessagingException {
        when(folder.search(any(AndTerm.class)))
            .thenReturn(new Message[]{});
        when(mockSynchronizer.getFolder(any()))
            .thenReturn(folder);
        when(imapSyncService.getSynchronizer(Id.of(1, Imap.class)))
            .thenReturn(mockSynchronizer);
        runner.start();
        subject.move(message, spam);
        until(() -> subject.pendingSize() == 0);
        runner.interrupt();
      }

      @Test
      public void deletesTheMoveStateRecord() {
        assertEquals(0, moveStateRepository.count());
      }
    }

    @Nested
    class WhenFolderMissingException {
      @BeforeEach
      public void setUp() throws
          ImapAccountMissingException,
          FolderMissingException,
          FolderRecordMissingException,
          InterruptedException {
        when(mockSynchronizer.getFolder(any()))
            .thenThrow(new FolderMissingException(spam));
        when(imapSyncService.getSynchronizer(Id.of(1, Imap.class)))
            .thenReturn(mockSynchronizer);
        runner.start();
        subject.move(message, spam);
        until(() -> subject.pendingSize() == 0);
        runner.interrupt();
      }

      @Test
      public void deletesTheMoveStateRecord() {
        assertEquals(0, moveStateRepository.count());
      }
    }

    @Nested
    class WhenImapAccountMissingException {

      @BeforeEach
      public void setUp() throws
          FolderRecordMissingException,
          ImapAccountMissingException,
          InterruptedException {
        when(imapSyncService.getSynchronizer(Id.of(1, Imap.class)))
            .thenThrow(new ImapAccountMissingException(Id.of(1, Imap.class)));
        runner.start();
        subject.move(message, spam);
        until(() -> subject.pendingSize() == 0);
        runner.interrupt();
      }

      @Test
      public void deletesTheMoveStateRecord() {
        assertEquals(0, moveStateRepository.count());
      }
    }
  }
}
