package com.robwilliamson.mailfamiliar.service;

import com.robwilliamson.mailfamiliar.config.ImapSync;
import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.repository.*;
import com.robwilliamson.mailfamiliar.service.imap.*;
import com.robwilliamson.test.Wait;
import org.flywaydb.test.FlywayTestExecutionListener;
import org.flywaydb.test.annotation.FlywayTest;
import org.flywaydb.test.junit5.annotation.FlywayTestExtension;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.messaging.MessageChannel;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener;

import java.util.*;
import java.util.stream.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@FlywayTestExtension
@FlywayTest
@SpringBootTest
@TestExecutionListeners({DependencyInjectionTestExecutionListener.class,
    FlywayTestExecutionListener.class})
class ImapSyncServiceTest {
  ImapSyncService subject;

  @Mock
  AccountProvider accountProvider;
  @Mock
  MessageChannel imapEventChannel;

  @Autowired
  HeaderNameRepository headerNameRepository;
  @Autowired
  HeaderRepository headerRepository;
  @Autowired
  ImapSync imapSync;
  @Autowired
  MailboxRepository mailboxRepository;
  @Autowired
  MessageRepository messageRepository;
  @Autowired
  ThreadPoolTaskExecutor taskExecutor;

  Imap account1;
  Imap account2;
  Imap account3;
  Map<Integer, Synchronizer> synchronizersByImapAccountId;

  private Imap makeAccount(int number) {
    var result = new Imap();
    result.setId(number);
    result.setName("Account number " + number);
    result.setPort(number);
    result.setHost("host.number." + number);
    result.setTls(true);
    return result;
  }

  @BeforeEach
  @FlywayTest
  void setUp() throws InterruptedException {
    account1 = makeAccount(1);
    account2 = makeAccount(2);
    account3 = makeAccount(3);
    synchronizersByImapAccountId = new HashMap<>();

    when(accountProvider.getAccounts()).thenReturn(Stream.of(account3));

    subject = new ImapSyncService(
        accountProvider,
        mailboxRepository,
        taskExecutor) {
      @Override
      public Synchronizer getSynchronizer(Imap imap) {
        return synchronizersByImapAccountId.computeIfAbsent(
            imap.getId(),
            id -> mock(Synchronizer.class));
      }
    };
    subject.initialize();
    Wait.until(() -> !subject.synchronizers.isEmpty());
  }

  @Test
  void onAccountRemoved() {
    subject.onAccountRemoved(account3);
    assertEquals(0, subject.synchronizers.size());
  }

  @Test
  void mailboxenFor_returnsNoMailboxen() {
    final List<Mailbox> mailboxen = subject.mailboxenFor(account3.getId())
        .collect(Collectors.toList());
    assertEquals(0, mailboxen.size());
  }

  @Test
  void getSynchronizer_throws() {
    assertThrows(ImapAccountMissingException.class, () -> subject.getSynchronizer(
        Id.of(account2.getId(), Imap.class)));
  }

  @Nested
  class OnNewAccount {

    @Nested
    class AlreadyExists {
      @BeforeEach
      void setUp() {
        subject.onNewAccount(account1);
      }

      @Test
      void itThrows() {
        assertThrows(DuplicateAccountCreatedException.class,
            () -> subject.onNewAccount(account1));
      }

      @Test
      void othersCanBeAdded() {
        assertDoesNotThrow(() -> subject.onNewAccount(account2));
      }
    }
  }

  @Nested
  class WhenAccountInDb {
    @BeforeEach
    void setUp() {
      mailboxRepository.save(new Mailbox(
          0,
          account3.getId(),
          "mailbox for account 3"
      ));
    }

    @Test
    void mailboxenFor_returnsCorrectMailboxen() {
      final List<Mailbox> mailboxen = subject.mailboxenFor(account3.getId())
          .collect(Collectors.toList());
      assertEquals(1, mailboxen.size());
    }

    @Test
    void getSynchronizer_providesTheCorrectSynchronizer() throws ImapAccountMissingException {
      assertEquals(
          synchronizersByImapAccountId.get(account3.getId()),
          subject.getSynchronizer(
              Id.of(account3.getId(), Imap.class)));
    }
  }
}