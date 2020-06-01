package com.robwilliamson.mailfamiliar.model;

import com.robwilliamson.mailfamiliar.entity.User;
import lombok.Data;

@Data
public class Imap {
  private String host;
  private float moveThreshold;
  private String name;
  private String password;
  private int port;
  private int refreshPeriodMinutes;
  private int syncPeriodDays;
  private boolean tls;
  private User user;
}
