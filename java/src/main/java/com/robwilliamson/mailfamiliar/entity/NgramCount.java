package com.robwilliamson.mailfamiliar.entity;

import lombok.*;

import javax.persistence.*;
import java.io.Serializable;

@Data
@Entity
@IdClass(NgramCount.Key.class)
@NoArgsConstructor
@Table(name = "ngram_count")
public class NgramCount {
  private int count;
  @EmbeddedId
  @ManyToOne(cascade = CascadeType.ALL)
  private @NonNull Ngram ngram;
  @EmbeddedId
  @ManyToOne(cascade = CascadeType.ALL)
  private @NonNull NgramValue value;

  @Data
  @Embeddable
  @NoArgsConstructor
  public static class Key implements Serializable {
    private Ngram ngram;
    private @NonNull NgramValue value;
  }
}
