package com.robwilliamson.mailfamiliar.config;

import org.springframework.context.annotation.*;
import org.springframework.context.event.*;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class ThreadPool {
  @Bean
  public TaskExecutor taskExecutor() {
    final ThreadPoolTaskExecutor taskExecutor = new ThreadPoolTaskExecutor();
    taskExecutor.setCorePoolSize(1);
    taskExecutor.setQueueCapacity(0);
    taskExecutor.setMaxPoolSize(Integer.MAX_VALUE);
    taskExecutor.setThreadNamePrefix("default_task_executor_thread_");
    taskExecutor.initialize();
    return taskExecutor;
  }

  @Bean(name = "applicationEventMulticaster")
  public ApplicationEventMulticaster simpleApplicationEventMulticaster(TaskExecutor taskExecutor) {
    final SimpleApplicationEventMulticaster simpleApplicationEventMulticaster =
        new SimpleApplicationEventMulticaster();
    simpleApplicationEventMulticaster.setTaskExecutor(taskExecutor);
    return simpleApplicationEventMulticaster;
  }
}
