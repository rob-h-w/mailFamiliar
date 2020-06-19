package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.service.CryptoService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.MessageChannel;

import javax.annotation.PostConstruct;
import javax.mail.*;
import java.util.*;
import java.util.stream.Stream;

import static javax.mail.Folder.*;

@RequiredArgsConstructor
public class Synchronizer implements Runnable {
  private final CryptoService cryptoService;
  private final Imap imap;
  private final MessageChannel imapEventChannel;
  private Id<Imap> imapAccountId;

  @PostConstruct
  private void quack() {
    imapAccountId = Id.of(imap.getId(), Imap.class);
  }

  @Override
  public void run() {
    final String password;

    try {
      password = cryptoService.decrypt(
          Id.of(imap.getUserId(), User.class),
          Id.of(imap.getPassword(), Encrypted.class));
    } catch (MissingSecretException | MissingUserException e) {
      throw new RuntimeException(e);
    }

    final Properties properties = new Properties();
    final String protocol = imap.isTls() ? "imaps" : "imap";
    properties.put("mail." + protocol + ".user", imap.getName());
    properties.put("mail." + protocol + ".port", imap.getPort());
    properties.put("mail.host", imap.getHost());
    properties.put("mail." + protocol + ".peek", true);

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
      final Folder defaultFolder = store.getDefaultFolder();
      imapEventChannel.send(new DefaultFolderOpenedEvent(defaultFolder, imapAccountId));
      sync(defaultFolder);
    } catch (MessagingException e) {
      throw new RuntimeException(e);
    }
  }

  private void sync(Folder folder) throws MessagingException {
    for (Folder f : List.of(folder.list())) {
      sync(f);
    }

    if ((folder.getType() & HOLDS_MESSAGES) != 0) {
      folder.open(READ_WRITE);
      Stream.of(folder.getMessages())
          .forEach(message -> imapEventChannel.send(new ImapMessageEvent(
              imapAccountId,
              message)));
    }
  }
}
