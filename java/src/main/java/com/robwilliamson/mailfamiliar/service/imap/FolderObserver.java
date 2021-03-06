package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.events.*;
import com.robwilliamson.mailfamiliar.exceptions.FromMissingException;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.context.ApplicationEventPublisher;

import javax.annotation.PostConstruct;
import javax.mail.Header;
import javax.mail.Message;
import javax.mail.*;
import javax.mail.event.*;
import javax.transaction.Transactional;
import java.util.*;
import java.util.stream.*;

import static javax.mail.event.MessageChangedEvent.ENVELOPE_CHANGED;

@Log4j2
@RequiredArgsConstructor
public class FolderObserver implements
    AutoCloseable,
    ConnectionListener,
    MessageChangedListener,
    MessageCountListener {
  private final ApplicationEventPublisher eventPublisher;
  private final Folder folder;
  private final HeaderNameRepository headerNameRepository;
  private final HeaderRepository headerRepository;
  private final Mailbox mailbox;
  private final MessageRepository messageRepository;

  private final Map<String, HeaderName> headerNames = new HashMap<>();

  @PostConstruct
  void init() {
    folder.addConnectionListener(this);
    folder.addMessageChangedListener(this);
    folder.addMessageCountListener(this);
  }

  @Transactional
  public Date syncMessages(Folder folder, Date limit) throws MessagingException,
      FromMissingException {
    final int messageCount = folder.getMessageCount();
    Date lastSynced = limit;

    for (int seqNumber = messageCount; seqNumber > 0; seqNumber--) {
      final Message message = folder.getMessage(seqNumber);
      final Date receivedDate = message.getReceivedDate();
      if (receivedDate.before(limit)) {
        break;
      }

      upsertMessage(message);

      if (receivedDate.after(lastSynced)) {
        lastSynced = receivedDate;
      }
    }

    return lastSynced;
  }

  private void upsertMessageReportThrow(Message message) {
    try {
      upsertMessage(message);
    } catch (
        MessagingException
            | FromMissingException e) {
      eventPublisher.publishEvent(SynchronizerException.builder(
          this,
          mailbox.getImapAccountIdObject())
          .throwable(e)
          .build());
    }
  }

  private void upsertMessage(Message message) throws
      MessagingException,
      FromMissingException {
    final var headerIterator = message.getAllHeaders().asIterator();
    final Map<String, List<String>> headers = StreamSupport.stream(
        ((Iterable<Header>) () -> headerIterator).spliterator(),
        false)
        .collect(Collectors.groupingBy(
            header -> header.getName().toLowerCase(),
            Collectors.mapping(Header::getValue, Collectors.toList())));
    headers.keySet()
        .stream()
        .forEach(key -> headerNames.computeIfAbsent(
            key,
            name -> headerNameRepository.findByName(key).orElseGet(() -> {
              final var headerName = new HeaderName();
              headerName.setName(key);
              return headerNameRepository.save(headerName);
            })));
    final var newMessageEntity = com.robwilliamson.mailfamiliar.entity.Message
        .from(message, mailbox.getId());
    final com.robwilliamson.mailfamiliar.entity.Message messageEntity =
        messageRepository.findByExample(newMessageEntity)
            .orElseGet(() -> messageRepository.save(newMessageEntity));
    headerRepository.deleteAllByMessageId(messageEntity.getId());
    final var headerEntities = headers.entrySet()
        .stream()
        .flatMap(header -> {
          final HeaderName headerName = headerNames.get(header.getKey());
          return header.getValue()
              .stream()
              .map(value -> {
                final var entity = new com.robwilliamson.mailfamiliar.entity.Header();
                entity.setHeaderName(headerName);
                entity.setMessageId(messageEntity.getId());
                entity.setValue(value);
                return entity;
              });
        })
        .collect(Collectors.toSet());
    messageEntity.setHeaders(headerEntities);
    messageRepository.save(messageEntity);
    eventPublisher.publishEvent(new ImapMessage(
        this,
        Id.of(mailbox.getImapAccountId(), Imap.class),
        headers,
        messageEntity));
  }

  private void removeMessageReportThrow(Message message) {
    try {
      removeMessage(message);
    } catch (
        MessagingException
            | FromMissingException e) {
      eventPublisher.publishEvent(SynchronizerException.builder(
          this,
          mailbox.getImapAccountIdObject())
          .throwable(e)
          .build());
    }
  }

  private void removeMessage(Message message) throws
      MessagingException,
      FromMissingException {
    messageRepository.findByExample(
        com.robwilliamson.mailfamiliar.entity.Message
            .from(message, mailbox.getId()))
        .ifPresent(messageEntity -> {
          headerRepository.deleteAllByMessageId(messageEntity.getId());
          messageRepository.deleteById(messageEntity.getId());
        });
  }

  @Override
  public void opened(ConnectionEvent e) {
    log.info(e);
  }

  @Override
  public void disconnected(ConnectionEvent e) {
    log.info(e);
  }

  @Override
  public void closed(ConnectionEvent e) {
    log.info(e);
  }

  @Override
  @Transactional
  public void messageChanged(MessageChangedEvent e) {
    if ((e.getMessageChangeType() & ENVELOPE_CHANGED) == 0) {
      return;
    }

    upsertMessageReportThrow(e.getMessage());
  }

  @Override
  @Transactional
  public void messagesAdded(MessageCountEvent messageCountEvent) {
    for (final var message : messageCountEvent.getMessages()) {
      upsertMessageReportThrow(message);
    }
  }

  @Override
  @Transactional
  public void messagesRemoved(MessageCountEvent messageCountEvent) {
    for (final var message : messageCountEvent.getMessages()) {
      removeMessageReportThrow(message);
    }
  }

  @Override
  public void close() throws MessagingException {
    folder.removeConnectionListener(this);
    folder.removeMessageChangedListener(this);
    folder.removeMessageCountListener(this);

    if (folder.isOpen()) {
      folder.close();
    }
  }
}
