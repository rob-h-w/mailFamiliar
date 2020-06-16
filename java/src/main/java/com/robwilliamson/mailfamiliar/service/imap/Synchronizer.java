package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.service.CryptoService;
import lombok.RequiredArgsConstructor;
import org.springframework.integration.mail.ImapMailReceiver;

import javax.mail.MessagingException;

@RequiredArgsConstructor
public class Synchronizer implements AutoCloseable, Runnable {
  private final CryptoService cryptoService;
  private final Imap imap;
  private final MailReceiverFactory mailReceiverFactory;
  private ImapMailReceiver mailReceiver;

  @Override
  public void run() {
    final String password;

    try {
      password = cryptoService.decrypt(
          Id.of(imap.getUserId(), User.class),
          imap.getPassword());
    } catch (MissingSecretException | MissingUserException e) {
      throw new RuntimeException(e);
    }

    mailReceiver = mailReceiverFactory.create(imap, password);
    try {
      mailReceiver.waitForNewMessages();
    } catch (MessagingException e) {
      throw new RuntimeException(e);
    }
  }

  @Override
  public void close() {
    if (mailReceiver != null) {
      mailReceiver.cancelPing();
    }
  }
}
