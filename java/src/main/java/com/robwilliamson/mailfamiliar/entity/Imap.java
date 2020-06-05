package com.robwilliamson.mailfamiliar.entity;

import lombok.Data;

import javax.persistence.*;
import java.io.Serializable;

@Data
@Entity
@Table(name = "imap", indexes = {@Index(columnList = "host,name", unique = true)})
public class Imap implements Serializable {
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;
  private String host;
  private float moveThreshold;
  private String name;
  private int password;
  private int port;
  private int refreshPeriodMinutes;
  private int syncPeriodDays;
  private boolean tls;
  private int userId;
}
