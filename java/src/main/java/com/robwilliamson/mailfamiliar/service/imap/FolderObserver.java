package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.repository.*;
import com.robwilliamson.mailfamiliar.service.imap.events.ImapMessage;
import lombok.extern.log4j.Log4j2;
import org.springframework.messaging.MessageChannel;

import javax.mail.Header;
import javax.mail.Message;
import javax.mail.*;
import javax.mail.event.*;
import javax.transaction.Transactional;
import java.util.*;
import java.util.stream.*;

import static com.robwilliamson.mailfamiliar.repository.Time.from;

@Log4j2
public class FolderObserver implements
    AutoCloseable,
    ConnectionListener,
    MessageChangedListener,
    MessageCountListener {
  private final Folder folder;
  private final HeaderNameRepository headerNameRepository;
  private final HeaderRepository headerRepository;
  private final Id<Imap> imapAccountId;
  private final MessageChannel imapEventChannel;
  private final MessageRepository messageRepository;

  private final Map<String, Integer> headerNameIds = new HashMap<>();

  FolderObserver(Folder folder,
                 HeaderNameRepository headerNameRepository,
                 HeaderRepository headerRepository,
                 Id<Imap> imapAccountId,
                 MessageChannel imapEventChannel,
                 MessageRepository messageRepository) {
    this.folder = folder;
    this.headerNameRepository = headerNameRepository;
    this.headerRepository = headerRepository;
    this.imapAccountId = imapAccountId;
    this.imapEventChannel = imapEventChannel;
    this.messageRepository = messageRepository;
    folder.addConnectionListener(this);
    folder.addMessageChangedListener(this);
    folder.addMessageCountListener(this);
  }

  @Transactional
  Date syncMessages(Folder folder, Mailbox mailbox, Date limit) throws MessagingException, com.robwilliamson.mailfamiliar.entity.Message.FromMissingException {
    final int messageCount = folder.getMessageCount();
    Date lastSynced = limit;

    final var imapMessages = new LinkedList<ImapMessage>();

    for (int seqNumber = messageCount; seqNumber > 0; seqNumber--) {
      final Message message = folder.getMessage(seqNumber);
      final Date receivedDate = message.getReceivedDate();
      if (receivedDate.before(limit)) {
        break;
      }
      final var messageIterator = message.getAllHeaders().asIterator();
      final Map<String, List<String>> headers = StreamSupport.stream(
          ((Iterable<Header>) () -> messageIterator).spliterator(),
          false)
          .collect(Collectors.groupingBy(
              header -> header.getName().toLowerCase(),
              Collectors.mapping(Header::getValue, Collectors.toList())));
      headers.entrySet()
          .stream()
          .forEach(entry -> headerNameIds.computeIfAbsent(
              entry.getKey(),
              name -> (headerNameRepository.findByName(entry.getKey()).orElseGet(() -> {
                var headerName = new HeaderName();
                headerName.setName(entry.getKey());
                return headerNameRepository.save(headerName);
              })).getId()));
      final int fromHash = com.robwilliamson.mailfamiliar.entity.Message.fromHashOf(headers);
      final Date sentDate = message.getSentDate();
      final com.robwilliamson.mailfamiliar.entity.Message messageEntity =
          messageRepository.findByFromHashAndMailboxIdAndReceivedDateAndSentDate(
              fromHash,
              mailbox.getId(),
              from(receivedDate),
              from(sentDate))
              .orElseGet(() -> {
                final var entity =
                    new com.robwilliamson.mailfamiliar.entity.Message();
                entity.setFromHash(fromHash);
                entity.setMailboxId(mailbox.getId());
                entity.setReceivedDate(receivedDate);
                entity.setSentDate(sentDate);
                return messageRepository.save(entity);
              });
      headers.entrySet()
          .stream()
          .forEach(header -> {
            final int nameId = headerNameIds.get(header.getKey());
            header.getValue()
                .stream()
                .forEach(value -> headerRepository.findByHeaderNameIdAndMessageId(
                    nameId,
                    messageEntity.getId())
                    .orElseGet(() -> {
                      final var entity =
                          new com.robwilliamson.mailfamiliar.entity.Header();
                      entity.setHeaderNameId(nameId);
                      entity.setMessageId(messageEntity.getId());
                      entity.setValue(value);
                      return headerRepository.save(entity);
                    }));
          });
      imapMessages.add(new ImapMessage(
          headers,
          imapAccountId,
          messageEntity));
      if (receivedDate.after(lastSynced)) {
        lastSynced = receivedDate;
      }
    }

    imapMessages
        .stream()
        .forEach(imapEventChannel::send);

    return lastSynced;
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

  }

  @Override
  public void messageChanged(MessageChangedEvent e) {

  }

  @Override
  public void messagesAdded(MessageCountEvent e) {

  }

  @Override
  public void messagesRemoved(MessageCountEvent e) {

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
