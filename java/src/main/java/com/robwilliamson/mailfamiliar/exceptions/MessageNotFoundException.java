package com.robwilliamson.mailfamiliar.exceptions;

import com.robwilliamson.mailfamiliar.entity.Message;

public class MessageNotFoundException extends Throwable {
  public MessageNotFoundException(Message message) {
    super("Could not find a mail on the server matching " + message);
  }
}
