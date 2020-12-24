package com.robwilliamson.mailfamiliar.config;

import com.robwilliamson.mailfamiliar.config.Integration.Channels;
import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.service.ImapSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.*;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.messaging.*;

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
