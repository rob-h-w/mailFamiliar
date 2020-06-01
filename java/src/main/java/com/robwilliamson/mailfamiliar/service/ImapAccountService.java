package com.robwilliamson.mailfamiliar.service;

import com.robwilliamson.mailfamiliar.authorization.AuthorizedUser;
import com.robwilliamson.mailfamiliar.entity.Encrypted;
import com.robwilliamson.mailfamiliar.entity.User;
import com.robwilliamson.mailfamiliar.model.Imap;
import com.robwilliamson.mailfamiliar.repository.EncryptedRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class ImapAccountService {
  private final CryptoService cryptoService;
  private final EncryptedRepository encryptedRepository;

  public Collection<Imap> getAccounts(AuthorizedUser principal) {
    final User user = principal.user();
    final Encrypted userSecret = encryptedRepository.findById(user.getSecret()).get();
    return user.getImaps()
        .stream()
        .map(imapEntity -> {
          final Imap imapMode = new Imap();
          final Encrypted imapSecret = encryptedRepository.findById(imapEntity.getPassword()).get();
          BeanUtils.copyProperties(imapEntity, imapMode);
          imapMode.setPassword(new String(cryptoService.decrypt(userSecret, imapSecret)));
          return imapMode;
        })
        .collect(Collectors.toList());
  }
}
