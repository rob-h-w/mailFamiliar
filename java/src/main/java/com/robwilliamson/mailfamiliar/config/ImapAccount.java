package com.robwilliamson.mailfamiliar.config;

import com.robwilliamson.mailfamiliar.config.Integration.Channels;
import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.service.ImapSyncService;
import com.robwilliamson.mailfamiliar.service.imap.StoreFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.*;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.messaging.*;

import javax.mail.Session;
import java.util.function.Consumer;

@Configuration
@RequiredArgsConstructor
public class ImapAccount {
  private final ImapSyncService imapSyncService;

  @Bean
  @ServiceActivator(inputChannel = Channels.Constants.NEW_IMAP_ACCOUNT)
  public MessageHandler imapAccountSyncHandleNew() {
    return messageHandlerFor(Channels.NEW_IMAP_ACCOUNT.value,
        message -> imapSyncService.onNewAccount((Imap) message.getPayload()));
  }

  @Bean
  @ServiceActivator(inputChannel = Channels.Constants.IMAP_ACCOUNT_REMOVED)
  public MessageHandler imapAccountSyncHandleRemove() {
    return messageHandlerFor(Channels.IMAP_ACCOUNT_REMOVED.value,
        message -> imapSyncService.onAccountRemoved((Imap) message.getPayload()));
  }

  @Bean
  public StoreFactory createStoreFactory() {
    return (props, authenticator) -> Session
        .getInstance(props, authenticator)
        .getStore("imap");
  }

  private MessageHandler messageHandlerFor(String channel, Consumer<Message<?>> passThrough) {
    return message -> {
      try {
        passThrough.accept(message);
      } catch (Exception e) {
        throw new MessagingException(channel, e);
      }
    };
  }
}
