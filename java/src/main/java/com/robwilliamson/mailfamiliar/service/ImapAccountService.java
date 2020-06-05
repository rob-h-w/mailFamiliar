package com.robwilliamson.mailfamiliar.service;

import com.robwilliamson.mailfamiliar.authorization.AuthorizedUser;
import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.exceptions.AnotherUsersAccountException;
import com.robwilliamson.mailfamiliar.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.transaction.Transactional;
import java.util.*;
import java.util.stream.Collectors;

import static com.robwilliamson.mailfamiliar.CopyProperties.copy;

@RequiredArgsConstructor
@Service
public class ImapAccountService {
  private final CryptoService cryptoService;
  private final EncryptedRepository encryptedRepository;
  private final ImapAccountRepository imapAccountRepository;
  private final MailboxRepository mailboxRepository;

  public Collection<com.robwilliamson.mailfamiliar.model.Imap> getAccounts(
      AuthorizedUser principal) {
    final User user = principal.user();
    return imapAccountRepository.findByUserId(user.getId())
        .stream()
        .map(imapEntity -> copy(imapEntity, new com.robwilliamson.mailfamiliar.model.Imap()))
        .collect(Collectors.toList());
  }

  @Transactional
  public void saveAccount(
      AuthorizedUser principal,
      com.robwilliamson.mailfamiliar.model.Imap imapModel) {
    final User user = principal.user();
    final Imap entity = copy(imapModel, new Imap());
    entity.setUserId(user.getId());
    //noinspection OptionalGetWithoutIsPresent
    final Encrypted userSecret = encryptedRepository.findById(user.getSecret()).get();
    final Encrypted imapSecret = encryptedRepository.save(cryptoService.encrypt(userSecret,
        imapModel.getPassword().getBytes()));
    entity.setPassword(imapSecret.getId());
    imapAccountRepository.save(entity);
  }

  @Transactional
  public void deleteAccount(User user, int id) {
    final Optional<Imap> imapOptional = imapAccountRepository.findById(id);

    if (imapOptional.isEmpty()) {
      return;
    }

    Imap imap = imapOptional.get();

    if (imap.getUserId() != user.getId()) {
      throw new AnotherUsersAccountException();
    }

    encryptedRepository.deleteById(imap.getPassword());
    imapAccountRepository.delete(imap);
  }

  public Collection<Mailbox> mailboxenFor(User user, int imapAccountId) {
    final Optional<Imap> imapOptional = imapAccountRepository.findById(imapAccountId);

    if (imapOptional.isEmpty()) {
      return List.of();
    }

    final Imap imap = imapOptional.get();

    if (imap.getUserId() != user.getId()) {
      throw new AnotherUsersAccountException();
    }

    return mailboxRepository.findByImapAccountId(imapAccountId);
  }
}
