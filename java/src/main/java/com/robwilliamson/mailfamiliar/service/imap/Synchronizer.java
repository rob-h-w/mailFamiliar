package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.entity.Imap;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class Synchronizer implements Runnable {
  private final Imap imap;

  @Override
  public void run() {
  }
}
