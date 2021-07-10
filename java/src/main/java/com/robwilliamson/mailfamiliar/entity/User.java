package com.robwilliamson.mailfamiliar.entity;

import lombok.*;
import org.apache.commons.lang3.builder.HashCodeBuilder;

import javax.persistence.*;

import static com.robwilliamson.mailfamiliar.Equals.doEquals;

@AllArgsConstructor
@Builder
@Entity
@Getter
@NoArgsConstructor
@Setter
@Table(name = "user")
@ToString
public class User {
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;
  private String name;
  private String remoteId;
  private int secret;

  @Override
  public boolean equals(Object obj) {
    return doEquals(
        User.class,
        this,
        obj,
        (builder, right) -> builder
            .append(getName(), right.getName())
            .append(getRemoteId(), right.getRemoteId()));
  }

  @Override
  public int hashCode() {
    return new HashCodeBuilder()
        .append(getName())
        .append(getRemoteId())
        .hashCode();
  }
}

