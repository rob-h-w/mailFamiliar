package com.robwilliamson.mailfamiliar.entity;

import lombok.Data;

import javax.persistence.*;
import javax.validation.constraints.NotBlank;

@Data
@Entity
@Table(name = "mailbox")
public class Mailbox {
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;
  private int imapAccountId;
  @NotBlank
  private String name;
}
