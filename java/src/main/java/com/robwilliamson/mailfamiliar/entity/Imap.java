package com.robwilliamson.mailfamiliar.entity;

import lombok.*;
import org.apache.commons.lang.builder.HashCodeBuilder;

import javax.persistence.*;
import java.io.Serializable;

import static com.robwilliamson.mailfamiliar.Equals.doEquals;

@AllArgsConstructor
@Builder
@Entity
@Getter
@NoArgsConstructor
@Setter
@Table(name = "imap", indexes = {@Index(columnList = "host,name", unique = true)})
@ToString
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

  @Override
  public boolean equals(Object obj) {
    return doEquals(
        Imap.class,
        this,
        obj,
        (builder, right) -> builder
            .append(getHost(), right.getHost())
            .append(getName(), right.getName())
            .append(getUserId(), right.getUserId()));
  }

  public com.robwilliamson.mailfamiliar.model.Id<Imap> getAccountId() {
    return com.robwilliamson.mailfamiliar.model.Id.of(id, Imap.class);
  }

  @Override
  public int hashCode() {
    return new HashCodeBuilder()
        .append(getHost())
        .append(getName())
        .append(getUserId())
        .hashCode();
  }
}
