package com.robwilliamson.mailfamiliar.service;

import com.robwilliamson.mailfamiliar.config.ImapSync;
import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.repository.*;
import com.robwilliamson.mailfamiliar.service.imap.*;
import com.robwilliamson.mailfamiliar.service.move.Mover;
import com.zaxxer.hikari.HikariDataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.test.annotation.FlywayTest;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import javax.mail.Message;
import javax.mail.*;
import javax.mail.event.MessageCountEvent;
import javax.mail.search.*;
import javax.sql.DataSource;
import java.util.concurrent.atomic.AtomicInteger;
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
  DataSource dataSource;
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
  @Autowired
  @Qualifier("taskExecutor")
  ThreadPoolTaskExecutor taskExecutor;

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
  int priorCount;

  MoverService subject;

  @BeforeEach
  @FlywayTest
  public void setUp() throws MessagingException, ImapAccountMissingException, FolderMissingException {
    priorCount = taskExecutor.getActiveCount();
    reset(imapSyncService);
    reset(mockSynchronizer);
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
    lenient().when(mockSynchronizer.getFolder(any()))
        .thenReturn(folder);
    when(imapSyncService.getSynchronizer(Id.of(1, Imap.class)))
        .thenReturn(mockSynchronizer);
    final Mover mover = new Mover(
        imapSyncService,
        mailboxRepository,
        moveStateRepository);
    subject = new MoverService(
        mover,
        taskExecutor);
    subject.init();
  }

  @AfterEach
  void tearDown() throws InterruptedException {
    try {
      moveStateRepository.deleteAll();
      untilIdle();
    } finally {
      flyway.clean();
    }
  }

  private void untilIdle() throws InterruptedException {
    final AtomicInteger timesIdle = new AtomicInteger();
    final int timesNeeded = 10;
    until(() -> {
      int activeCount =
          ((HikariDataSource) dataSource).getHikariPoolMXBean().getActiveConnections();
      if (activeCount == 0) {
        timesIdle.getAndIncrement();
      } else {
        timesIdle.set(0);
      }

      return timesIdle.get() == timesNeeded;
    });
    until(() -> taskExecutor.getActiveCount() <= priorCount + 1);
  }

  @Nested
  class Move {
    @Nested
    class HappyPath {
      @Mock
      Folder inboxFolder;
      @Mock
      Folder spamFolder;

      boolean wasCopied;
      boolean wasDeleted;
      boolean wasExpunged;

      @BeforeEach
      public void setUp() throws
          FolderMissingException,
          ImapAccountMissingException,
          FolderRecordMissingException,
          InterruptedException,
          MessagingException {
        wasCopied = false;
        doAnswer(answer -> {
          wasCopied = true;
          return null;
        })
            .when(inboxFolder)
            .copyMessages(new Message[]{javaxMessage}, spamFolder);
        wasDeleted = false;
        doAnswer(answer -> {
          wasDeleted = true;
          return null;
        })
            .when(javaxMessage)
            .setFlag(Flags.Flag.DELETED, true);
        wasExpunged = false;
        doAnswer(answer -> {
          wasExpunged = true;
          return null;
        })
            .when(inboxFolder)
            .expunge();
        var flags = mock(Flags.class);
        doAnswer(answer -> wasDeleted)
            .when(flags)
            .contains(Flags.Flag.DELETED);
        doReturn(flags)
            .when(javaxMessage)
            .getFlags();
        doAnswer(answer -> {
          final SearchTerm term = answer.getArgument(0);

          return (wasDeleted && wasExpunged) || !term.match(javaxMessage)
              ? new Message[]{}
              : new Message[]{javaxMessage};
        })
            .when(inboxFolder)
            .search(any());
        doReturn(inboxFolder)
            .when(mockSynchronizer)
            .getFolder(inbox);
        doAnswer(answer -> {
          final SearchTerm term = answer.getArgument(0);

          return wasCopied && term.match(javaxMessage)
              ? new Message[]{javaxMessage}
              : new Message[]{};
        })
            .when(spamFolder)
            .search(any());
        doReturn(spamFolder)
            .when(mockSynchronizer)
            .getFolder(spam);
        subject.move(message, spam);

        untilIdle();
        until(() -> countInvocations(
            inboxFolder,
            "expunge",
            new Object[]{})
            > 0);
        until(() -> moveStateRepository.findAll().iterator().next().getState() == Done);
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
        subject.move(message, spam);
        until(() -> moveStateRepository.count() > 0);
        until(() -> countInvocations(
            mockSynchronizer,
            "getFolder",
            new Object[]{inbox})
            > 1);
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
        when(folder.search(any(AndTerm.class)))
            .thenReturn(new Message[]{
                javaxMessage,
                anotherMessage});
        subject.move(message, spam);
        until(() -> moveStateRepository.count() > 0);
        until(() -> countInvocations(
            mockSynchronizer,
            "getFolder",
            new Object[]{inbox})
            > 1);
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
        subject.move(message, spam);
        untilIdle();
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
        subject.move(message, spam);
        untilIdle();
//        until(() -> subject.pendingSize() == 0);
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
        subject.move(message, spam);
        untilIdle();
//        until(() -> subject.pendingSize() == 0);
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
        subject.move(message, spam);
        untilIdle();
//        until(() -> subject.pendingSize() == 0);
      }

      @Test
      public void deletesTheMoveStateRecord() {
        assertEquals(0, moveStateRepository.count());
      }
    }
  }
}
