package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.entity.User;
import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.repository.*;
import com.robwilliamson.mailfamiliar.service.CryptoService;
import com.robwilliamson.mailfamiliar.service.imap.events.DefaultFolderAvailable;
import org.flywaydb.test.FlywayTestExecutionListener;
import org.flywaydb.test.annotation.FlywayTest;
import org.junit.jupiter.api.*;
import org.mockito.Mock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.*;
import org.springframework.messaging.MessageChannel;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener;

import javax.mail.*;
import javax.mail.event.FolderEvent;

import static com.robwilliamson.test.Data.*;
import static javax.mail.Folder.*;
import static javax.mail.event.FolderEvent.CREATED;
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
  MailboxRepository mailboxRepository;
  @MockBean(name = "imapEvent")
  MessageChannel imapEventChannel;
  @MockBean
  StoreFactory storeFactory;
  @Mock
  Folder defaultFolder;
  @Mock
  Folder inbox;
  @Mock
  Store store;
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
    mockFolder(inbox, "INBOX");
    when(defaultFolder.getType()).thenReturn(HOLDS_FOLDERS);
    when(defaultFolder.list()).thenReturn(new Folder[]{inbox});
    when(defaultFolder.getName()).thenReturn("");
    when(store.getDefaultFolder()).thenReturn(defaultFolder);
    doReturn(store).when(storeFactory).getInstance(any(), any());
    subject = new Synchronizer(
        cryptoService,
        imap,
        mailboxRepository,
        imapEventChannel,
        storeFactory);
    subject.init();
    assertEquals(0, mailboxRepository.count());
  }

  @AfterEach
  void tearDown() {
    reset(imapEventChannel);
    reset(storeFactory);
  }

  @Nested
  class Run {
    @BeforeEach
    void setUp() {
      subject.run();
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
      void setUp() throws MessagingException {
        mockFolder(storable, "storable");
        subject.folderCreated(new FolderEvent(new Object(), storable, CREATED));
      }

      @Test
      void storesTheFolder() {
        assertEquals(1, mailboxRepository.count());
        assertEquals("storable", mailboxRepository.findAll().iterator().next().getName());
      }
    }
  }
}