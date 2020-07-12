package com.robwilliamson.mailfamiliar.exceptions;

public class FolderRecordMissingException extends Throwable {
  public FolderRecordMissingException(int mailboxId) {
    super("No record of folder with ID " + mailboxId);
  }
}
