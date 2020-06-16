package com.robwilliamson.mailfamiliar.service.predictor;

import com.robwilliamson.mailfamiliar.service.imap.ImapHeaders;
import org.springframework.lang.Nullable;

import java.time.LocalDate;

public interface Message {
  LocalDate date();

  ImapHeaders headers();

  int seq();

  @Nullable
  Integer size();

  int uid();
}
