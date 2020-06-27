package com.robwilliamson.mailfamiliar.entity;

import lombok.Data;

import javax.persistence.*;
import java.util.*;

import static com.robwilliamson.mailfamiliar.repository.Time.*;

@Data
@Entity
@Table(name = "message")
public class Message {
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;
  private int mailboxId;
  private int fromHash;
  private String receivedDate;
  private String sentDate;

  public static int fromHashOf(Map<String, List<String>> headers) throws FromMissingException {
    final Optional<List<String>> from = Optional.ofNullable(headers.get("from"));
    if (from.isEmpty() || from.get().isEmpty()) {
      throw new FromMissingException();
    }

    return from.get()
        .stream()
        .mapToInt(String::hashCode)
        .reduce(0, (left, right) -> left ^ right);
  }

  public void setReceivedDate(Date date) {
    this.receivedDate = from(date);
  }

  public Date receivedDate() {
    return parseDate(this.receivedDate);
  }

  public void setSentDate(Date date) {
    this.sentDate = from(date);
  }

  public Date sentDate() {
    return parseDate(this.sentDate);
  }

  public static class FromMissingException extends Throwable {
  }
}
