package com.robwilliamson.mailfamiliar.service;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.events.*;
import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.repository.*;
import com.robwilliamson.mailfamiliar.service.imap.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import javax.mail.*;
import javax.transaction.Transactional;
import java.util.*;
import java.util.stream.*;

@RequiredArgsConstructor
@Service
public class ImapAccountService implements
    AccountProvider,
    StoreSettingsProvider,
    UserAccountIdentifier {
  private final CryptoService cryptoService;
  private final ApplicationEventPublisher eventPublisher;
  private final EncryptedRepository encryptedRepository;
  private final ImapAccountRepository imapAccountRepository;

  public Collection<Imap> getAccountsFor(
      User user) {
    return imapAccountRepository.findByUserId(user.getId());
  }

  @Override
  public Stream<Imap> getAccounts() {
    return StreamSupport.stream(imapAccountRepository.findAll().spliterator(), false);
  }

  @Transactional
  public Imap saveAccount(
      User user,
      Imap imap,
      String imapPassword) throws MissingSecretException, MissingUserException {
    imap.setUserId(user.getId());
    final Encrypted imapSecret = encryptedRepository.save(
        cryptoService.encrypt(Id.of(user.getId(), User.class), imapPassword));
    imap.setPassword(imapSecret.getId());
    final Imap saved = imapAccountRepository.save(imap);
    eventPublisher.publishEvent(new NewImapAccount(this, saved));
    return saved;
  }

  @Transactional
  public void deleteAccount(int id) {
    final Optional<Imap> imapOptional = imapAccountRepository.findById(id);

    if (imapOptional.isEmpty()) {
      return;
    }

    Imap imap = imapOptional.get();

    encryptedRepository.deleteById(imap.getPassword());
    imapAccountRepository.delete(imap);
  }

  @Override
  public Optional<Id<User>> ownerOf(Id<Imap> imapAccountId) {
    Optional<Imap> imapOptional = imapAccountRepository.findById(imapAccountId.getValue());
    if (imapOptional.isEmpty()) {
      return Optional.empty();
    }

    return Optional.of(Id.of(
        imapOptional.get().getUserId(),
        User.class));
  }

  @Override
  public Authenticator getAuthenticatorFor(Imap imap) {
    final String password;

    try {
      password = cryptoService.decrypt(
          Id.of(imap.getUserId(), User.class),
          Id.of(imap.getPassword(), Encrypted.class));
    } catch (MissingSecretException | MissingUserException e) {
      eventPublisher.publishEvent(new SynchronizerException(
          this,
          Id.of(imap.getId(), Imap.class),
          SynchronizerException.Reason.ProgrammerError,
          Optional.of(e)));
      throw new RuntimeException(e);
    }

    return new Authenticator() {
      @Override
      protected PasswordAuthentication getPasswordAuthentication() {
        return new PasswordAuthentication(imap.getName(), password);
      }
    };
  }

  @Override
  public Properties getPropertiesFor(Imap imap) {
    final Properties properties = new Properties();
    properties.put("mail.imap.user", imap.getName());
    properties.put("mail.imap.port", imap.getPort());
    properties.put("mail.host", imap.getHost());
    properties.put("mail.imap.peek", true);
    if (imap.isTls()) {
      properties.put("mail.imap.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
    }

    return properties;
  }
}
