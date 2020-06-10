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

import static com.robwilliamson.mailfamiliar.CopyProperties.copy;
import static com.robwilliamson.mailfamiliar.model.User.from;

@RequiredArgsConstructor
@Service
public class ImapAccountService implements AccountProvider, UserAccountIdentifier {
  private final CryptoService cryptoService;
  private final EncryptedRepository encryptedRepository;
  private final ImapAccountRepository imapAccountRepository;
  private final UserRepository userRepository;

  public Collection<com.robwilliamson.mailfamiliar.model.Imap> getAccountsFor(
      User user) {
    return imapAccountRepository.findByUserId(user.getId())
        .stream()
        .map(imapEntity -> {
          var model = copy(imapEntity, new com.robwilliamson.mailfamiliar.model.Imap());
          model.setUser(com.robwilliamson.mailfamiliar.model.User.from(user));
          return model;
        })
        .collect(Collectors.toList());
  }

  @Override
  public Stream<com.robwilliamson.mailfamiliar.model.Imap> getAccounts() {
    return StreamSupport.stream(imapAccountRepository.findAll().spliterator(), false)
        .map(entity -> {
          var model = copy(entity, new com.robwilliamson.mailfamiliar.model.Imap());
          var optionalUser = userRepository.findById(entity.getUserId());

          if (optionalUser.isEmpty()) {
            throw new IllegalStateException();
          }

          model.setUser(from(optionalUser.get()));
          return model;
        });
  }

  @Payload
  @Publisher(channel = Integration.Channels.Constants.NEW_IMAP_ACCOUNT)
  @Transactional
  public com.robwilliamson.mailfamiliar.model.Imap saveAccount(
      User user,
      com.robwilliamson.mailfamiliar.model.Imap imapModel) {
    final Imap entity = copy(imapModel, new Imap());
    entity.setUserId(user.getId());
    //noinspection OptionalGetWithoutIsPresent
    final Encrypted userSecret = encryptedRepository.findById(user.getSecret()).get();
    final Encrypted imapSecret = encryptedRepository.save(
        cryptoService.encrypt(
            userSecret,
            imapModel.getPassword().getBytes()));
    entity.setPassword(imapSecret.getId());
    imapAccountRepository.save(entity);
    imapModel.setUser(from(user));
    return imapModel;
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
  public Optional<Id<com.robwilliamson.mailfamiliar.model.User>> ownerOf(Id<com.robwilliamson.mailfamiliar.model.Imap> imapAccountId) {
    Optional<Imap> imapOptional = imapAccountRepository.findById(imapAccountId.getValue());
    if (imapOptional.isEmpty()) {
      return Optional.empty();
    }

    return Optional.of(Id.of(
        imapOptional.get().getUserId(),
        com.robwilliamson.mailfamiliar.model.User.class));
  }
}
