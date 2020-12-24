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

  public enum Channels {
    NEW_IMAP_ACCOUNT(Constants.NEW_IMAP_ACCOUNT);
    public final String value;

    Channels(String channel) {
      this.value = channel;
    }

    public static class Constants {
      public static final String NEW_IMAP_ACCOUNT = "newImapAccount";
    }
  }
}
