package com.robwilliamson.mailfamiliar.config;

import com.robwilliamson.mailfamiliar.entropy.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.*;
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
