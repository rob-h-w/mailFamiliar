package com.robwilliamson.mailfamiliar.entity;

import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import javax.persistence.*;
import java.util.List;

@Builder
@Data
@Entity
@Getter
@Setter
@Table(name = "user")
public class User {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private int id;
  @OneToMany(mappedBy = "user")
  private List<Imap> imaps;
  private String name;
  private String remoteId;
}

