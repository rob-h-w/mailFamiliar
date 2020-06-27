package com.robwilliamson.mailfamiliar.config;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.repository.*;
import com.robwilliamson.mailfamiliar.service.CryptoService;
import com.robwilliamson.mailfamiliar.service.imap.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.*;
import org.springframework.messaging.MessageChannel;

@Configuration
@RequiredArgsConstructor
public class ImapSync {
  private final CryptoService cryptoService;
  private final HeaderNameRepository headerNameRepository;
  private final HeaderRepository headerRepository;
  private final MailboxRepository mailboxRepository;
  private final MessageRepository messageRepository;
  private final MessageChannel imapEvent;
  private final StoreFactory storeFactory;
  private final SyncRepository syncRepository;

  @Bean(name = "Synchronizer")
  @Scope(BeanDefinition.SCOPE_PROTOTYPE)
  public Synchronizer createSynchronizer(Imap imap) {
    return new Synchronizer(
        cryptoService,
        headerNameRepository,
        headerRepository,
        imap,
        imapEvent,
        mailboxRepository,
        messageRepository,
        storeFactory,
        syncRepository);
  }
}
