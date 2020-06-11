package com.robwilliamson.mailfamiliar.config;

import com.robwilliamson.mailfamiliar.service.imap.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.*;

@Configuration
@RequiredArgsConstructor
public class ImapSync {

  @Bean
  public SynchronizerFactory synchronizerFactory() {
    return Synchronizer::new;
  }
}
