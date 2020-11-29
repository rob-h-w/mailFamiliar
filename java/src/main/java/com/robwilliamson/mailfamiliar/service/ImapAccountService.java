package com.robwilliamson.mailfamiliar.service;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.event.NewImapAccountEvent;
import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.repository.*;
import com.robwilliamson.mailfamiliar.service.imap.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import javax.transaction.Transactional;
import java.util.*;
import java.util.stream.*;

@RequiredArgsConstructor
@Service
public class ImapAccountService implements AccountProvider, UserAccountIdentifier {
  private final ApplicationEventPublisher applicationEventPublisher;
  private final CryptoService cryptoService;
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
    imapAccountRepository.save(imap);
    applicationEventPublisher.publishEvent(new NewImapAccountEvent(this, imap));
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
