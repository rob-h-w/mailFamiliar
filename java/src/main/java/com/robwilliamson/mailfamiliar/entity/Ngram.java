package com.robwilliamson.mailfamiliar.entity;

import lombok.*;
import org.apache.commons.lang.builder.HashCodeBuilder;

import javax.persistence.*;
import java.util.List;

import static com.robwilliamson.mailfamiliar.Equals.doEquals;

@AllArgsConstructor
@Builder
@Entity
@Getter
@NoArgsConstructor
@Setter
@Table(name = "ngram")
@ToString
public class Ngram {
  @OneToMany(
      cascade = CascadeType.ALL,
      fetch = FetchType.EAGER,
      mappedBy = "ngram")
  private List<NgramCount> counts;
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;
  @NonNull
  private String name;
  private int n;

  @Override
  public boolean equals(Object obj) {
    return doEquals(
        Ngram.class,
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

