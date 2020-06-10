package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.model.Imap;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class Synchronizer implements Runnable {
  private final Imap imapAccount;

  @Override
  public void run() {
  }
}
