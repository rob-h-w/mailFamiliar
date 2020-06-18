package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.service.CryptoService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.MessageChannel;

import javax.mail.*;
import java.util.Properties;
import java.util.stream.Stream;

@RequiredArgsConstructor
public class Synchronizer implements Runnable {
  private final CryptoService cryptoService;
  private final Imap imap;
  private final MessageChannel imapEventChannel;

  @Override
  public void run() {
    final Id<Imap> imapAccountId = Id.of(imap.getId(), Imap.class);
    final Id<User> userId = Id.of(imap.getUserId(), User.class);
    final String password;

    try {
      password = cryptoService.decrypt(
          Id.of(imap.getUserId(), User.class),
          imap.getPassword());
    } catch (MissingSecretException | MissingUserException e) {
      throw new RuntimeException(e);
    }

    final Properties properties = new Properties();
    properties.put("mail.imap.port", imap.getPort());
    properties.put("mail.imap.host", imap.getHost());
    properties.put("mail.imap.peek", true);
    if (imap.isTls()) {
      properties.put("mail.imap.socketFactory", "javax.net.ssl.SSLSocketFactory");
    }

    final Session session = Session.getInstance(
        properties,
        new Authenticator() {
          @Override
          protected PasswordAuthentication getPasswordAuthentication() {
            return new PasswordAuthentication(imap.getName(), password);
          }
        });

    try (Store store = session.getStore("imap")) {
      store.connect();
      Stream.of(store.getDefaultFolder().getMessages())
          .forEach(message -> imapEventChannel.send(new ImapEvent(
              imapAccountId,
              message,
              userId)));
    } catch (MessagingException e) {
      throw new RuntimeException(e);
    }
  }
}
