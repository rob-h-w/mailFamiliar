package com.robwilliamson.mailfamiliar.entity;

import lombok.*;

import javax.persistence.*;
import java.io.Serializable;

@AllArgsConstructor
@Builder
@Data
@Entity
@Getter
@NoArgsConstructor
@Table(name = "imap", indexes = {@Index(columnList = "host,name", unique = true)})
public class Imap implements Serializable {
  @Id
  private String host;
  private float moveThreshold;
  @Id
  private String name;
  private int password;
  private int port;
  private int refreshPeriodMinutes;
  private int syncPeriodDays;
  private boolean tls;
  @Id
  @ManyToOne(optional = false)
  private User user;
}
