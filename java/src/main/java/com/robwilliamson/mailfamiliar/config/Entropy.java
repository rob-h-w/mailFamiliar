package com.robwilliamson.mailfamiliar.config;

import com.robwilliamson.mailfamiliar.entropy.RandomSource;
import com.robwilliamson.mailfamiliar.entropy.SeedFromStrongSource;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskExecutor;

@Configuration
@RequiredArgsConstructor
public class Entropy {
  private final TaskExecutor taskExecutor;

  @Bean
  RandomSource randomSource() {
    return new SeedFromStrongSource(taskExecutor);
  }
}
