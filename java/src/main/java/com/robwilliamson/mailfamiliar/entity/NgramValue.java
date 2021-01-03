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
@RequiredArgsConstructor
@Setter
@Table(name = "ngram_value")
@ToString
public class NgramValue {
  @NonNull String value;
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;

  @Override
  public boolean equals(Object obj) {
    return doEquals(
        NgramValue.class,
        this,
        obj,
        (builder, right) -> builder
            .append(getValue(), right.getValue()));
  }

  @Override
  public int hashCode() {
    return new HashCodeBuilder()
        .append(getValue())
        .hashCode();
  }
}
