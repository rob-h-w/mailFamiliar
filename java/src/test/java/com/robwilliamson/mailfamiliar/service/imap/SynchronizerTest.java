package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.config.ImapSync;
import com.robwilliamson.mailfamiliar.entity.User;
import com.robwilliamson.mailfamiliar.events.FolderSynchronized;
import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.repository.*;
import com.robwilliamson.mailfamiliar.service.CryptoService;
import com.robwilliamson.mailfamiliar.service.imap.events.*;
import com.robwilliamson.test.EventReceiver;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.stubbing.Answer;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.core.task.TaskExecutor;
import org.springframework.messaging.MessageChannel;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import javax.mail.*;
import javax.mail.event.FolderEvent;

import static com.robwilliamson.test.Data.*;
import static com.robwilliamson.test.Wait.until;
import static javax.mail.Folder.*;
import static javax.mail.event.FolderEvent.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SpringBootTest
class SynchronizerTest {
  Synchronizer subject;
  User user;
  @Autowired
  CryptoService cryptoService;
  @Autowired
  Flyway flyway;
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
  @MockBean
  EventReceiver synchronizedEventReceiver;
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
  @Autowired
  private EncryptedRepository encryptedRepository;
  @Autowired
  private UserRepository userRepository;

  private void mockFolder(Folder folder, String name) throws MessagingException {
    lenient().when(folder.getType()).thenReturn(HOLDS_FOLDERS | HOLDS_MESSAGES);
    lenient().when(folder.list()).thenReturn(new Folder[0]);
    lenient().when(folder.getMessages()).thenReturn(new Message[0]);
    lenient().when(folder.getName()).thenReturn(name);
    lenient().when(folder.getParent()).thenReturn(defaultFolder);
  }

  @BeforeEach
  void setUp() throws MessagingException, MissingUserException, MissingSecretException {
    flyway.clean();
    flyway.migrate();
    user = fakeUser(cryptoService, encryptedRepository, userRepository);
    final var secret = fakeUserSecret(user, cryptoService, encryptedRepository);
    final var imap = imapAccountEntity("imap.account");
    imap.setId(1);
    imap.setUserId(user.getId());
    imap.setPassword(secret.getId());
    imap.setSyncPeriodDays(30);
    mockFolder(inbox, "INBOX");
    lenient().when(defaultFolder.getType()).thenReturn(HOLDS_FOLDERS);
    lenient().when(defaultFolder.list()).thenReturn(new Folder[]{inbox});
    lenient().when(defaultFolder.getName()).thenReturn("");
    when(store.getDefaultFolder()).thenReturn(defaultFolder);
    doReturn(store).when(storeFactory).getInstance(any(), any());
    when(imapEventChannel.send(any(FolderRemoved.class)))
        .thenAnswer((Answer<Void>) invocationOnMock -> {
          final var event = invocationOnMock.getArguments()[0];
          if (event instanceof FolderRemoved) {
            folderRemoved = (FolderRemoved) event;
          }
          return null;
        });
    subject = imapSync.createSynchronizer(imap, taskExecutor);
  }

  @AfterEach
  void tearDown() throws InterruptedException {
    subject.close();
    until(() -> ((ThreadPoolTaskExecutor) taskExecutor).getActiveCount() == 2);
    reset(synchronizedEventReceiver);
    reset(imapEventChannel);
    reset(storeFactory);
    flyway.clean();
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
  class ImapEvent {
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
        mockFolder(storable, "storable");
        ArgumentCaptor<Object> synchronizedArgumentCaptor =
            ArgumentCaptor.forClass(Object.class);
        message1 = mockMessage("from@mail.com", "to@mail.com");
        when(storable.getMessageCount()).thenReturn(1);
        when(storable.getMessage(1)).thenReturn(message1);
        subject.folderCreated(new FolderEvent(new Object(), storable, CREATED));
        until(() -> {
          verify(synchronizedEventReceiver, atLeast(0))
              .onEvent(synchronizedArgumentCaptor.capture());
          System.out.println(synchronizedArgumentCaptor.getAllValues()
              .stream()
              .filter(event -> event instanceof FolderSynchronized)
              .count());
          return synchronizedArgumentCaptor.getAllValues()
              .stream()
              .filter(event -> event instanceof FolderSynchronized)
              .count() > 0;
        });
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