package com.robwilliamson.mailfamiliar.entity;

import lombok.*;

import javax.persistence.*;

@AllArgsConstructor
@Builder
@Data
@Entity
@Getter
@NoArgsConstructor
@Table(name = "user")
public class User {
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;
  private String name;
  private String remoteId;
  private int secret;
}

