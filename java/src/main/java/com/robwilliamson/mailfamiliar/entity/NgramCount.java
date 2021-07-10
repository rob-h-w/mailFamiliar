package com.robwilliamson.mailfamiliar.entity;

import lombok.*;
import org.apache.commons.lang3.builder.HashCodeBuilder;

import javax.persistence.*;
import java.io.Serializable;

import static com.robwilliamson.mailfamiliar.Equals.doEquals;

@AllArgsConstructor
@Builder
@Entity
@Getter
@IdClass(NgramCount.Key.class)
@NoArgsConstructor
@Setter
@Table(name = "ngram_count")
public class NgramCount {
  private int count;
  @EmbeddedId
  @ManyToOne(cascade = CascadeType.ALL)
  private @NonNull Ngram ngram;
  @EmbeddedId
  @ManyToOne(cascade = CascadeType.ALL)
  private @NonNull NgramValue value;

  @Override
  public String toString() {
    return getClass().getSimpleName()
        + "(" + getCount()
        + ", Ngram(id: " + ngram.getId()
        + ", name: " + ngram.getName()
        + "), " + getValue()
        + ")";
  }

  @Override
  public boolean equals(Object obj) {
    return doEquals(
        NgramCount.class,
        this,
        obj,
        (builder, right) -> builder
            .append(getNgram(), right.getNgram())
            .append(getValue(), right.getValue()));
  }

  @Override
  public int hashCode() {
    return new HashCodeBuilder()
        .append(getNgram())
        .append(getValue())
        .hashCode();
  }

  @AllArgsConstructor
  @Data
  @Embeddable
  @NoArgsConstructor
  public static class Key implements Serializable {
    private Ngram ngram;
    private @NonNull NgramValue value;
  }
}
