package com.robwilliamson.mailfamiliar.entity;

import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import javax.persistence.*;
import java.io.Serializable;

@Builder
@Data
@Entity
@Getter
@IdClass(Imap.class)
@Setter
@Table(name = "imap", indexes = {@Index(columnList = "host,name", unique = true)})
public class Imap implements Serializable {
  @Id
  private String host;
  private float moveThreshold;
  @Id
  private String name;
  private String password;
  private int port;
  private int refreshPeriodMinutes;
  private int syncPeriodDays;
  private boolean tls;
  @Id
  @ManyToOne(optional = false)
  private User user;
}
