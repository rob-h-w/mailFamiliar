package com.robwilliamson.mailfamiliar.entity;

import com.robwilliamson.mailfamiliar.repository.Time;
import lombok.*;

import javax.mail.*;
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

  public static class FromMissingException extends Throwable {
  }
}
