package com.robwilliamson.mailfamiliar.entity;

import lombok.*;

import javax.persistence.*;
import java.util.List;

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
  @OneToMany(fetch = FetchType.EAGER, mappedBy = "user")
  private List<Imap> imaps;
  private String name;
  private String remoteId;
  private int secret;
}
