package com.robwilliamson.mailfamiliar.exceptions;

import com.robwilliamson.mailfamiliar.entity.Message;
import lombok.Getter;

import java.util.*;

@Getter
public class MultipleMessagesFoundException extends Throwable {
  private final List<javax.mail.Message> excess;
  private final javax.mail.Message keeper;
  private final Message messageEntity;

  public MultipleMessagesFoundException(
      Message message,
      javax.mail.Message[] found) {
    super("Expected exactly 1 Imap message matching " + message + ", but found " + found.length);
    keeper = found[0];
    messageEntity = message;
    excess = Arrays.asList(Arrays.copyOfRange(found, 1, found.length));
  }
}
