package com.robwilliamson.mailfamiliar.exceptions;

public class DuplicateAccountCreatedException extends RuntimeException {
  public DuplicateAccountCreatedException(int accountId) {
    super("Account "
        + accountId
        + " has already been created, but was notified as a new account.");
  }
}
