package com.robwilliamson.mailfamiliar.service;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.exceptions.DuplicateAccountCreatedException;
import com.robwilliamson.mailfamiliar.repository.MailboxRepository;
import com.robwilliamson.mailfamiliar.service.imap.*;
import com.robwilliamson.test.Wait;
import org.flywaydb.test.FlywayTestExecutionListener;
import org.flywaydb.test.annotation.FlywayTest;
import org.flywaydb.test.junit5.annotation.FlywayTestExtension;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener;

import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

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

  @Autowired
  MailboxRepository mailboxRepository;

  Imap account1;
  Imap account2;
  Imap account3;
  SynchronizerFactory synchronizerFactory;
  ThreadPoolTaskExecutor taskExecutor;

  @BeforeEach
  @FlywayTest
  void setUp() throws InterruptedException {
    synchronizerFactory = imap -> Mockito.mock(Synchronizer.class);
    taskExecutor = new ThreadPoolTaskExecutor();
    taskExecutor.initialize();
    account1 = new Imap();
    account1.setId(1);

    account2 = new Imap();
    account2.setId(2);

    account3 = new Imap();
    account3.setId(3);

    when(accountProvider.getAccounts()).thenReturn(Stream.of(account3));

    subject = new ImapSyncService(
        accountProvider,
        mailboxRepository,
        synchronizerFactory,
        taskExecutor);
    subject.initialize();
    Wait.until(() -> !subject.synchronizers.isEmpty());
  }

  @Test
  void onAccountRemoved() {
    subject.onAccountRemoved(account3);
    assertEquals(0, subject.synchronizers.size());
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
}