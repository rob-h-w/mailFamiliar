package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.config.ImapSync;
import com.robwilliamson.mailfamiliar.entity.User;
import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.repository.*;
import com.robwilliamson.mailfamiliar.service.CryptoService;
import com.robwilliamson.mailfamiliar.service.imap.events.*;
import org.flywaydb.test.FlywayTestExecutionListener;
import org.flywaydb.test.annotation.FlywayTest;
import org.junit.jupiter.api.*;
import org.mockito.Mock;
import org.mockito.stubbing.Answer;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.*;
import org.springframework.core.task.TaskExecutor;
import org.springframework.messaging.MessageChannel;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener;

import javax.mail.*;
import javax.mail.event.FolderEvent;

import static com.robwilliamson.test.Data.*;
import static com.robwilliamson.test.Wait.until;
import static javax.mail.Folder.*;
import static javax.mail.event.FolderEvent.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@FlywayTest
@SpringBootTest
@TestExecutionListeners({DependencyInjectionTestExecutionListener.class,
    MockitoTestExecutionListener.class,
    FlywayTestExecutionListener.class})
class SynchronizerTest {
  Synchronizer subject;
  User user;
  @Autowired
  CryptoService cryptoService;
  @Autowired
  ImapSync imapSync;
  @Autowired
  HeaderRepository headerRepository;
  @Autowired
  MailboxRepository mailboxRepository;
  @Autowired
  MessageRepository messageRepository;
  @MockBean(name = "imapEvent")
  MessageChannel imapEventChannel;
  @MockBean
  StoreFactory storeFactory;
  @Mock
  Folder defaultFolder;
  @Mock
  Folder inbox;
  Message message1;
  @Mock
  Store store;
  @Qualifier("taskExecutor")
  @Autowired
  TaskExecutor taskExecutor;
  FolderRemoved folderRemoved;
  FolderSynchronized folderSynchronized;
  @Autowired
  private EncryptedRepository encryptedRepository;
  @Autowired
  private UserRepository userRepository;

  private void mockFolder(Folder folder, String name) throws MessagingException {
    when(folder.getType()).thenReturn(HOLDS_FOLDERS | HOLDS_MESSAGES);
    when(folder.list()).thenReturn(new Folder[0]);
    when(folder.getMessages()).thenReturn(new Message[0]);
    when(folder.getName()).thenReturn(name);
    when(folder.getParent()).thenReturn(defaultFolder);
  }

  @BeforeEach
  @FlywayTest
  void setUp() throws MessagingException, MissingUserException, MissingSecretException {
    user = fakeUser(cryptoService, encryptedRepository, userRepository);
    final var secret = fakeUserSecret(user, cryptoService, encryptedRepository);
    final var imap = imapAccountEntity("imap.account");
    imap.setId(1);
    imap.setUserId(user.getId());
    imap.setPassword(secret.getId());
    imap.setSyncPeriodDays(30);
    mockFolder(inbox, "INBOX");
    when(defaultFolder.getType()).thenReturn(HOLDS_FOLDERS);
    when(defaultFolder.list()).thenReturn(new Folder[]{inbox});
    when(defaultFolder.getName()).thenReturn("");
    when(store.getDefaultFolder()).thenReturn(defaultFolder);
    doReturn(store).when(storeFactory).getInstance(any(), any());
    when(imapEventChannel.send(any(FolderSynchronized.class)))
        .thenAnswer((Answer<Void>) invocationOnMock -> {
          final var event = invocationOnMock.getArguments()[0];
          if (event instanceof FolderSynchronized) {
            folderSynchronized = (FolderSynchronized) event;
          }
          return null;
        });
    when(imapEventChannel.send(any(FolderRemoved.class)))
        .thenAnswer((Answer<Void>) invocationOnMock -> {
          final var event = invocationOnMock.getArguments()[0];
          if (event instanceof FolderRemoved) {
            folderRemoved = (FolderRemoved) event;
          }
          return null;
        });
    subject = imapSync.createSynchronizer(imap);
  }

  @AfterEach
  void tearDown() {
    reset(imapEventChannel);
    reset(storeFactory);
  }

  @Nested
  class Run {

    @BeforeEach
    void setUp() throws InterruptedException {
      until(() -> mailboxRepository.count() > 0);
    }

    @AfterEach
    void tearDown() {
      subject.close();
    }

    @Test
    void storesMailboxen() {
      assertEquals(1, mailboxRepository.count());
      assertEquals("INBOX", mailboxRepository.findAll().iterator().next().getName());
    }

    @Test
    void signalsThatTheDefaultFolderIsAvailable() {
      verify(imapEventChannel, times(1))
          .send(any(DefaultFolderAvailable.class));
    }
  }

  @Nested
  class FolderCreated {
    @Nested
    class WithIgnoredFolder {
      @Mock
      Folder drafts;

      @BeforeEach
      void setUp() throws MessagingException {
        mockFolder(drafts, "Drafts");
        subject.folderCreated(new FolderEvent(new Object(), drafts, CREATED));
      }

      @Test
      void ignoresTheFolder() {
        assertEquals(0, mailboxRepository.count());
      }
    }

    @Nested
    class WithStorableFolder {
      @Mock
      Folder storable;

      @BeforeEach
      void setUp() throws MessagingException, InterruptedException {
        folderSynchronized = null;
        mockFolder(storable, "storable");
        message1 = mockMessage("from@mail.com", "to@mail.com");
        when(storable.getMessageCount()).thenReturn(1);
        when(storable.getMessage(1)).thenReturn(message1);
        subject.folderCreated(new FolderEvent(new Object(), storable, CREATED));
        until(() -> folderSynchronized != null);
      }

      @Test
      void storesTheFolder() {
        assertEquals(1, mailboxRepository.count());
        assertEquals("storable", mailboxRepository.findAll().iterator().next().getName());
      }

      @Test
      void storesTheMessage() {
        assertEquals(1, messageRepository.count());
        assertEquals(4, headerRepository.count());
      }

      @Test
      void synchronizesTheMessages() {
        verify(imapEventChannel, times(1))
            .send(any(ImapMessage.class));
      }

      @Test
      void doesNotReportExceptions() {
        verify(imapEventChannel, times(0))
            .send(any(SynchronizerException.class));
      }

      @Nested
      class ThenStorableFolderDeleted {
        @BeforeEach
        void setUp() throws InterruptedException {
          folderRemoved = null;
          subject.folderDeleted(new FolderEvent(new Object(), storable, DELETED));
          until(() -> folderRemoved != null);
        }

        @Test
        void removesTheMessage() {
          assertEquals(0, messageRepository.count());
          assertEquals(0, headerRepository.count());
        }
      }
    }
  }
}