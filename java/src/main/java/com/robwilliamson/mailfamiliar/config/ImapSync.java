package com.robwilliamson.mailfamiliar.config;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.repository.MailboxRepository;
import com.robwilliamson.mailfamiliar.service.CryptoService;
import com.robwilliamson.mailfamiliar.service.imap.Synchronizer;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.*;
import org.springframework.messaging.MessageChannel;

@Configuration
@RequiredArgsConstructor
public class ImapSync {
  private final CryptoService cryptoService;
  private final MailboxRepository mailboxRepository;
  private final MessageChannel imapEvent;

  @Bean(name = "Synchronizer")
  @Scope(BeanDefinition.SCOPE_PROTOTYPE)
  public Synchronizer createSynchronizer(Imap imap) {
    return new Synchronizer(cryptoService, imap, mailboxRepository, imapEvent);
  }
}
