package com.robwilliamson.mailfamiliar.entity;

import lombok.*;
import org.apache.commons.lang.builder.HashCodeBuilder;

import javax.persistence.*;
import javax.validation.constraints.NotBlank;

import static com.robwilliamson.mailfamiliar.Equals.doEquals;

@AllArgsConstructor
@Builder
@Entity
@Getter
@NoArgsConstructor
@Setter
@Table(name = "mailbox")
@ToString
public class Mailbox {
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;
  private int imapAccountId;
  @NotBlank
  private String name;

  @Override
  public boolean equals(Object obj) {
    return doEquals(
        Mailbox.class,
        this,
        obj,
        (builder, right) -> builder
            .append(getImapAccountId(), right.getImapAccountId())
            .append(getName(), right.getName())
    );
  }

  public com.robwilliamson.mailfamiliar.model.Id<Imap> getImapAccountIdObject() {
    return com.robwilliamson.mailfamiliar.model.Id.of(getImapAccountId(), Imap.class);
  }

  @Override
  public int hashCode() {
    return new HashCodeBuilder()
        .append(getImapAccountId())
        .append(getName())
        .hashCode();
  }
}
