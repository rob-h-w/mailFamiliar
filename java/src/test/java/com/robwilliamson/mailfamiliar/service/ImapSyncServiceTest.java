package com.robwilliamson.mailfamiliar.service;

import com.robwilliamson.mailfamiliar.config.ImapSync;
import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.repository.*;
import com.robwilliamson.mailfamiliar.service.imap.Synchronizer;
import com.robwilliamson.test.Wait;
import org.flywaydb.test.FlywayTestExecutionListener;
import org.flywaydb.test.annotation.FlywayTest;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.boot.test.context.*;
import org.springframework.boot.test.mock.mockito.*;
import org.springframework.context.annotation.*;
import org.springframework.core.task.TaskExecutor;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener;

import javax.mail.Folder;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@FlywayTest
@SpringBootTest
@TestExecutionListeners({
    DependencyInjectionTestExecutionListener.class,
    FlywayTestExecutionListener.class,
    MockitoTestExecutionListener.class})
class ImapSyncServiceTest {
  @MockBean
  ImapAccountService imapAccountService;
  @Autowired
  HeaderNameRepository headerNameRepository;
  @Autowired
  HeaderRepository headerRepository;
  @Autowired
  ImapSync imapSync;
  @Autowired
  MailboxRepository mailboxRepository;
  @Autowired
  Config config;
  @Autowired
  ImapSyncService subject;
  Imap account1;
  Imap account2;
  Imap account3;

  private Imap makeAccount(int number) {
    var result = new Imap();
    result.setId(number);
    result.setName("Account number " + number);
    result.setPort(number);
    result.setHost("host.number." + number);
    result.setTls(true);
    return result;
  }

  @AfterEach
  void tearDown() {
    subject.reset();
    reset(imapAccountService);
  }

  @BeforeEach
  @FlywayTest
  void setUp() throws InterruptedException {
    account1 = makeAccount(1);
    account2 = makeAccount(2);
    account3 = makeAccount(3);
    config.synchronizersByImapAccountId = new ConcurrentHashMap<>();

    when(imapAccountService.getAccounts()).thenAnswer(answer -> Stream.of(account3));

    assertEquals(0, subject.synchronizerCount());
    subject.discoverAccounts();
    Wait.until(() -> subject.synchronizerCount() > 0);
  }

  @Test
  void onAccountRemoved() {
    subject.onAccountRemoved(account3);
    assertEquals(0, subject.synchronizerCount());
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

  @TestConfiguration
  public static class Config {
    Map<Integer, Synchronizer> synchronizersByImapAccountId;

    @Bean(name = "Synchronizer")
    @Scope(BeanDefinition.SCOPE_PROTOTYPE)
    public Synchronizer createSynchronizer(Imap imap, TaskExecutor taskExecutor) throws FolderMissingException {
      final Synchronizer synchronizer = mock(Synchronizer.class);
      when(synchronizer.getFolder(any())).thenReturn(mock(Folder.class));
      synchronizersByImapAccountId.put(imap.getId(), synchronizer);
      return synchronizer;
    }
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
    void getSynchronizer_providesTheCorrectSynchronizer() throws ImapAccountMissingException, FolderMissingException {
      assertEquals(
          config.synchronizersByImapAccountId.get(account3.getId()).getFolder(null),
          subject.getSynchronizer(
              Id.of(account3.getId(), Imap.class)).getFolder(null));
    }

    @Nested
    class HandleAccountMissing {

      @BeforeEach
      public void setUp() {
        assertEquals(1, mailboxRepository.count());
        subject.handleAccountMissing(new ImapAccountMissingException(
            Id.of(account3.getId(), Imap.class)));
      }

      @Test
      void removesSynchronizer() {
        assertEquals(0, subject.synchronizerCount());
      }

      @Test
      void removesMailbox() {
        assertEquals(0, mailboxRepository.count());
      }

      @Test
      void closesTheSynchronizer() {
        verify(config.synchronizersByImapAccountId.values().iterator().next(), times(1))
            .close();
      }
    }
  }
}

