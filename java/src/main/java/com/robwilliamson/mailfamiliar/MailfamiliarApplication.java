package com.robwilliamson.mailfamiliar;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
public class MailfamiliarApplication {

  public static void main(String[] args) {
    SpringApplication.run(MailfamiliarApplication.class, args);
  }
}
