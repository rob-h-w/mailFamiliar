package com.robwilliamson.mailfamiliar.entity;

import lombok.Data;

import javax.persistence.*;
import javax.validation.constraints.NotBlank;

@Data
@Entity
public class Mailbox {
  @Id
  private int id;
  private int imapAccountId;
  @NotBlank
  private String name;
}
