package com.robwilliamson.mailfamiliar.model;

import com.robwilliamson.mailfamiliar.entity.User;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;

@Builder
@Data
@Getter
public class Imap {
  private final String host;
  private final float moveThreshold;
  private final String name;
  private final String password;
  private final int port;
  private final int refreshPeriodMinutes;
  private final int syncPeriodDays;
  private final boolean tls;
  private final User user;
}
