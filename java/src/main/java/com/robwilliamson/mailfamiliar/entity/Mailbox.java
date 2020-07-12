package com.robwilliamson.mailfamiliar.entity;

import lombok.*;

import javax.persistence.*;
import javax.validation.constraints.NotBlank;

@AllArgsConstructor
@Builder
@Data
@Entity
@NoArgsConstructor
@Table(name = "mailbox")
public class Mailbox {
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;
  private int imapAccountId;
  @NotBlank
  private String name;

  public com.robwilliamson.mailfamiliar.model.Id<Imap> getImapAccountIdObject() {
    return com.robwilliamson.mailfamiliar.model.Id.of(getImapAccountId(), Imap.class);
  }
}
