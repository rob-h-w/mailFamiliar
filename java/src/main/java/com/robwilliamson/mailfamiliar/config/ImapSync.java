package com.robwilliamson.mailfamiliar.config;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.repository.*;
import com.robwilliamson.mailfamiliar.service.imap.*;
import com.robwilliamson.mailfamiliar.service.imap.synchronizer.Engine;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.*;
import org.springframework.core.task.TaskExecutor;

import javax.mail.*;

@Configuration
@RequiredArgsConstructor
public class ImapSync {
  private final Engine engine;
  private final ApplicationEventPublisher eventPublisher;
  private final HeaderNameRepository headerNameRepository;
  private final HeaderRepository headerRepository;
  private final MailboxRepository mailboxRepository;
  private final MessageRepository messageRepository;
  private final StoreSettingsProvider storeSettingsProvider;
  private final SyncRepository syncRepository;

  @Bean
  public StoreFactory createStoreFactory() {
    return (props, authenticator) -> Session
        .getInstance(props, authenticator)
        .getStore("imap");
  }

  @Bean(name = "Synchronizer")
  @Scope(BeanDefinition.SCOPE_PROTOTYPE)
  public Synchronizer createSynchronizer(Imap imap, TaskExecutor taskExecutor) {
    return new Synchronizer(
        engine,
        eventPublisher,
        imap,
        this,
        mailboxRepository,
        createStoreFactory(),
        storeSettingsProvider,
        taskExecutor);
  }

  @Bean(name = "FolderObserver")
  @Scope(BeanDefinition.SCOPE_PROTOTYPE)
  public FolderObserver createFolderObserver(
      Folder folder,
      Mailbox mailbox) {
    return new FolderObserver(
        eventPublisher,
        folder,
        headerNameRepository,
        headerRepository,
        mailbox,
        messageRepository);
  }
}
