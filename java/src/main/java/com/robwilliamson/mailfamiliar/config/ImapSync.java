package com.robwilliamson.mailfamiliar.config;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.repository.MailboxRepository;
import com.robwilliamson.mailfamiliar.service.CryptoService;
import com.robwilliamson.mailfamiliar.service.imap.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.*;
import org.springframework.messaging.MessageChannel;

import javax.mail.Session;

@Configuration
@RequiredArgsConstructor
public class ImapSync {
  private final CryptoService cryptoService;
  private final MailboxRepository mailboxRepository;
  private final MessageChannel imapEvent;

  @Bean(name = "Synchronizer")
  @Scope(BeanDefinition.SCOPE_PROTOTYPE)
  public Synchronizer createSynchronizer(Imap imap, StoreFactory storeFactory) {
    return new Synchronizer(cryptoService, imap, mailboxRepository, imapEvent, storeFactory);
  }

  @Bean
  public StoreFactory createStoreFactory() {
    return (props, authenticator) -> Session
        .getInstance(props, authenticator)
        .getStore("imap");
  }
}
