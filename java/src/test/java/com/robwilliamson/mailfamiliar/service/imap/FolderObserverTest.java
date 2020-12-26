package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.MailfamiliarApplication;
import com.robwilliamson.mailfamiliar.config.ImapSync;
import com.robwilliamson.mailfamiliar.entity.Mailbox;
import com.robwilliamson.mailfamiliar.events.ImapMessage;
import com.robwilliamson.mailfamiliar.repository.*;
import com.robwilliamson.test.EventReceiver;
import org.flywaydb.test.FlywayTestExecutionListener;
import org.flywaydb.test.annotation.FlywayTest;
import org.junit.jupiter.api.*;
import org.mockito.Mock;
import org.mockito.stubbing.Answer;
import org.springframework.aop.framework.Advised;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.*;
import org.springframework.messaging.MessageChannel;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener;

import javax.mail.*;
import javax.mail.event.*;
import java.util.*;
import java.util.stream.*;

import static com.robwilliamson.test.Assertions.assertContains;
import static com.robwilliamson.test.Data.*;
import static com.robwilliamson.test.Wait.until;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@FlywayTest
@SpringBootTest(classes = MailfamiliarApplication.class)
@TestExecutionListeners({DependencyInjectionTestExecutionListener.class,
    MockitoTestExecutionListener.class,
    FlywayTestExecutionListener.class})
class FolderObserverTest {
  @Autowired
  HeaderNameRepository headerNameRepository;
  @Autowired
  HeaderRepository headerRepository;
  @MockBean(name = "imapEvent")
  MessageChannel imapEventChannel;
  @Autowired
  ImapSync imapSync;
  @Autowired
  MessageRepository messageRepository;
  @MockBean
  EventReceiver eventReceiver;
  @Mock
  Folder folder;
  ImapMessage imapMessage;
  private FolderObserver subject;
  private Mailbox mailbox;

  @BeforeEach
  @FlywayTest
  void setUp() {
    imapMessage = null;
    doAnswer((Answer<Void>) invocationOnMock -> {
      final var event = invocationOnMock.getArguments()[0];
      if (event instanceof ImapMessage) {
        imapMessage = (ImapMessage) event;
      }
      return null;
    })
        .when(eventReceiver).onEvent(any(ImapMessage.class));
    mailbox = new Mailbox();
    mailbox.setId(1);
    subject = imapSync.createFolderObserver(folder, mailbox);
  }

  @Test
  void registersObservers() throws Exception {
    final FolderObserver target =
        (FolderObserver) ((Advised) subject).getTargetSource().getTarget();
    verify(folder).addConnectionListener(target);
    verify(folder).addMessageChangedListener(target);
    verify(folder).addMessageCountListener(target);
  }

  @Nested
  class MessagesAdded {
    Message message1;

    @BeforeEach
    void setUp() throws MessagingException {
      message1 = mockMessage("from@from.com", "to@to.com");
      subject.messagesAdded(
          new MessageCountEvent(
              folder,
              MessageCountEvent.ADDED,
              false,
              new Message[]{message1}));
    }

    @Test
    void insertsTheMessageCorrectly() throws MessagingException {
      assertEquals(1, messageRepository.count());
      assertEquals(4, headerNameRepository.count());
      var msg = messageRepository.findByExample(
          com.robwilliamson.mailfamiliar.entity.Message.enhancedBuilder()
              .receivedDate(message1.getReceivedDate())
              .sentDate(message1.getSentDate())
              .mailboxId(1)
              .fromHash("from@from.com".hashCode())
              .build()).get();
      final int msgId = msg.getId();
      final var headersForMsg =
          StreamSupport.stream(
              headerRepository.findAllByMessageId(msgId).spliterator(),
              false)
              .collect(Collectors.toList());
      assertEquals(4, headersForMsg.size());
      var headerValues = headersForMsg
          .stream()
          .map(com.robwilliamson.mailfamiliar.entity.Header::getValue)
          .collect(Collectors.toSet());
      assertContains(
          Set.of(
              "from@from.com",
              "to@to.com"),
          headerValues);
    }

    @Nested
    class ThenMessageChanged {
      Enumeration<Header> unchangedHeaders;

      @BeforeEach
      void setUp() throws MessagingException, InterruptedException {
        unchangedHeaders = message1.getAllHeaders();

        when(message1.getAllHeaders()).thenReturn(mockHeaders("from@from.com", "<to@to.com>"));
        subject.messageChanged(
            new MessageChangedEvent(
                folder,
                MessageChangedEvent.ENVELOPE_CHANGED,
                message1));
        until(() -> imapMessage != null);
      }

      @Test
      void updatesTheMessageCorrectly() throws MessagingException {
        assertEquals(1, messageRepository.count());
        assertEquals(4, headerNameRepository.count());
        var msg = messageRepository.findByExample(
            com.robwilliamson.mailfamiliar.entity.Message.enhancedBuilder()
                .receivedDate(message1.getReceivedDate())
                .sentDate(message1.getSentDate())
                .mailboxId(1)
                .fromHash("from@from.com".hashCode())
                .build()).get();
        final int msgId = msg.getId();
        final var headersForMsg =
            StreamSupport.stream(
                headerRepository.findAllByMessageId(msgId).spliterator(),
                false)
                .collect(Collectors.toList());
        assertEquals(4, headersForMsg.size());
        var headerValues = headersForMsg
            .stream()
            .map(com.robwilliamson.mailfamiliar.entity.Header::getValue)
            .collect(Collectors.toSet());
        assertContains(
            Set.of(
                "from@from.com",
                "<to@to.com>"),
            headerValues);
      }

      @Nested
      class ThenMessageRemoved {

        @BeforeEach
        void setUp() {
          subject.messagesRemoved(new MessageCountEvent(
              folder,
              MessageCountEvent.REMOVED,
              true,
              new Message[]{message1}));
        }

        @Test
        void removesTheMessageCorrectly() {
          assertEquals(0, messageRepository.count());
          assertEquals(4, headerNameRepository.count());
          assertEquals(0, headerRepository.count());
        }
      }
    }
  }
}