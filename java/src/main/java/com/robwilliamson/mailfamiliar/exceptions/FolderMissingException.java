package com.robwilliamson.mailfamiliar.exceptions;

import com.robwilliamson.mailfamiliar.entity.Mailbox;

public class FolderMissingException extends Throwable {
  public FolderMissingException(Mailbox mailbox) {
    super("Could not find this mailbox on the server: " + mailbox);
  }
}
