package com.robwilliamson.mailfamiliar.entity;

import lombok.*;

import javax.persistence.*;
import java.util.List;

@Data
@Entity
@NoArgsConstructor
@Table(name = "ngram")
public class Ngram {
  @OneToMany(
      cascade = CascadeType.ALL,
      fetch = FetchType.EAGER,
      mappedBy = "ngram",
      orphanRemoval = true)
  private List<NgramCount> counts;
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;
  @NonNull
  private String name;
}
