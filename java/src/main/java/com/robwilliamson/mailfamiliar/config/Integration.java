package com.robwilliamson.mailfamiliar.config;

import org.springframework.context.annotation.*;
import org.springframework.core.task.TaskExecutor;
import org.springframework.integration.channel.PublishSubscribeChannel;
import org.springframework.integration.config.*;
import org.springframework.messaging.SubscribableChannel;

import static com.robwilliamson.mailfamiliar.config.Integration.Channels.Constants;

@Configuration
@EnableIntegration
@EnablePublisher
public class Integration {
  TaskExecutor taskExecutor;

  @Bean(name = Constants.NEW_IMAP_ACCOUNT)
  SubscribableChannel newAccountChannel() {
    return new PublishSubscribeChannel(taskExecutor);
  }

  @Bean(name = Constants.IMAP_ACCOUNT_REMOVED)
  SubscribableChannel accountRemovedChannel() {
    return new PublishSubscribeChannel(taskExecutor);
  }

  @Bean(name = Constants.IMAP_EVENT)
  SubscribableChannel imapEventChannel() {
    return new PublishSubscribeChannel(taskExecutor);
  }

  public enum Channels {
    NEW_IMAP_ACCOUNT(Constants.NEW_IMAP_ACCOUNT),
    IMAP_ACCOUNT_REMOVED(Constants.IMAP_ACCOUNT_REMOVED),
    IMAP_EVENT(Constants.IMAP_EVENT);
    public final String value;

    Channels(String channel) {
      this.value = channel;
    }

    public static class Constants {
      public static final String NEW_IMAP_ACCOUNT = "newImapAccount";
      public static final String IMAP_ACCOUNT_REMOVED = "imapAccountRemoved";
      public static final String IMAP_EVENT = "imapEvent";
    }
  }
}
