package com.robwilliamson.mailfamiliar.entity;

import lombok.*;

import javax.persistence.*;

@Data
@Entity
@NoArgsConstructor
@RequiredArgsConstructor
@Table(name = "ngram_value")
public class NgramValue {
  @NonNull String value;
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;
}
