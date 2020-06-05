package com.robwilliamson.mailfamiliar.model;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import java.io.Serializable;

@Data
public class Imap implements Serializable {
  private int id;
  @NotBlank
  private String host;
  private float moveThreshold;
  @NotBlank
  private String name;
  @NotBlank
  private String password;
  private int port;
  private int refreshPeriodMinutes;
  private int syncPeriodDays;
  private boolean tls;
  private User user;
}
