package com.robwilliamson.mailfamiliar.entity;

import lombok.*;
import org.apache.commons.lang.builder.HashCodeBuilder;

import javax.persistence.*;

import static com.robwilliamson.mailfamiliar.Equals.doEquals;

@AllArgsConstructor
@Builder
@Entity
@Getter
@NoArgsConstructor
@Setter
@Table(name = "header_name")
@ToString
public class HeaderName {
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;
  private String name;

  @Override
  public boolean equals(Object obj) {
    return doEquals(
        HeaderName.class,
        this,
        obj,
        (builder, right) -> builder
            .append(getName(), right.getName()));
  }

  @Override
  public int hashCode() {
    return new HashCodeBuilder()
        .append(getName())
        .hashCode();
  }
}
