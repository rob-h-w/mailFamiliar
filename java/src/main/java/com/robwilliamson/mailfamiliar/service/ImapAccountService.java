package com.robwilliamson.mailfamiliar.service;

import com.robwilliamson.mailfamiliar.config.Integration;
import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.repository.*;
import com.robwilliamson.mailfamiliar.service.imap.*;
import lombok.RequiredArgsConstructor;
import org.springframework.integration.annotation.Publisher;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import javax.transaction.Transactional;
import java.util.*;
import java.util.stream.*;

@RequiredArgsConstructor
@Service
public class ImapAccountService implements AccountProvider, UserAccountIdentifier {
  private final CryptoService cryptoService;
  private final EncryptedRepository encryptedRepository;
  private final ImapAccountRepository imapAccountRepository;
  private final UserRepository userRepository;

  public Collection<Imap> getAccountsFor(
      User user) {
    return imapAccountRepository.findByUserId(user.getId());
  }

  @Override
  public Stream<Imap> getAccounts() {
    return StreamSupport.stream(imapAccountRepository.findAll().spliterator(), false);
  }

  @Payload
  @Publisher(channel = Integration.Channels.Constants.NEW_IMAP_ACCOUNT)
  @Transactional
  public Imap saveAccount(
      User user,
      Imap imap,
      String imapPassword) {
    imap.setUserId(user.getId());
    //noinspection OptionalGetWithoutIsPresent
    final Encrypted userSecret = encryptedRepository.findById(user.getSecret()).get();
    final Encrypted imapSecret = encryptedRepository.save(
        cryptoService.encrypt(
            userSecret,
            imapPassword.getBytes()));
    imap.setPassword(imapSecret.getId());
    imapAccountRepository.save(imap);
    return imap;
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
}
