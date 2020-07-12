package com.robwilliamson.mailfamiliar.entity;

import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.repository.Time;
import lombok.*;

import javax.mail.*;
import javax.mail.search.*;
import javax.persistence.*;
import java.util.*;

@AllArgsConstructor
@Builder
@Data
@Entity
@Getter
@NoArgsConstructor
@Setter
@Table(name = "message")
public class Message {
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;
  private int mailboxId;
  private int fromHash;
  private String receivedDate;
  private String sentDate;
  @OneToMany(mappedBy = "messageId", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
  private Set<Header> headers;

  public static Message from(javax.mail.Message message, int mailboxId) throws
      MessagingException,
      FromMissingException {
    return Message.enhancedBuilder()
        .fromHash(fromHashOf(message.getFrom()))
        .mailboxId(mailboxId)
        .receivedDate(message.getReceivedDate())
        .sentDate(message.getSentDate())
        .build();
  }

  public static int fromHashOf(Address[] addresses) throws FromMissingException {
    if (addresses == null || addresses.length == 0) {
      throw new FromMissingException();
    }

    return List.of(addresses)
        .stream()
        .map(Address::toString)
        .mapToInt(String::hashCode)
        .reduce(0, (left, right) -> left ^ right);
  }

  public static EnhancedBuilder enhancedBuilder() {
    return new EnhancedBuilder();
  }

  public String getFrom() throws FromMissingException {
    return headers.stream()
        .filter(header -> Objects.equals(header.getHeaderName().getName(), "from"))
        .findFirst()
        .orElseThrow(FromMissingException::new)
        .getValue();
  }

  public javax.mail.Message getSelfIn(Folder folder) throws
      FromMissingException,
      MessagingException,
      MessageNotFoundException,
      MultipleMessagesFoundException {
    return findSelfIn(folder)
        .orElseThrow(() -> new MessageNotFoundException(this));
  }

  public Optional<javax.mail.Message> findSelfIn(Folder folder) throws
      MultipleMessagesFoundException,
      FromMissingException,
      MessagingException {
    final var result = folder.search(
        new AndTerm(
            new SearchTerm[]{
                new ReceivedDateTerm(ComparisonTerm.EQ, Time.parseDate(receivedDate)),
                new FromStringTerm(getFrom()),
                new SentDateTerm(ComparisonTerm.EQ, Time.parseDate(sentDate))
            }));
    if (result.length == 0) {
      return Optional.empty();
    }
    if (result.length > 1) {
      throw new MultipleMessagesFoundException(this, result);
    }
    return Optional.ofNullable(result[0]);
  }

  public static class EnhancedBuilder extends Message.MessageBuilder {
    @Override
    public EnhancedBuilder id(int id) {
      super.id(id);
      return this;
    }

    @Override
    public EnhancedBuilder mailboxId(int mailboxId) {
      super.mailboxId(mailboxId);
      return this;
    }

    @Override
    public EnhancedBuilder fromHash(int fromHash) {
      super.fromHash(fromHash);
      return this;
    }

    public EnhancedBuilder receivedDate(Date receivedDate) {
      super.receivedDate(Time.from(receivedDate));
      return this;
    }

    @Override
    public EnhancedBuilder receivedDate(String receivedDate) {
      super.receivedDate(receivedDate);
      return this;
    }

    public EnhancedBuilder sentDate(Date sentDate) {
      super.sentDate(Time.from(sentDate));
      return this;
    }

    @Override
    public EnhancedBuilder sentDate(String sentDate) {
      super.sentDate(sentDate);
      return this;
    }

    @Override
    public Message build() {
      return super.build();
    }
  }

}
