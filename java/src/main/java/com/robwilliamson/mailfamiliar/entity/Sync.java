package com.robwilliamson.mailfamiliar.entity;

import lombok.*;
import org.apache.commons.lang3.builder.HashCodeBuilder;

import javax.persistence.*;
import java.util.Date;

import static com.robwilliamson.mailfamiliar.Equals.doEquals;
import static com.robwilliamson.mailfamiliar.repository.Time.*;

@AllArgsConstructor
@Builder
@Entity
@Getter
@NoArgsConstructor
@Setter
@Table(name = "sync")
@ToString
public class Sync {
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;
  private int mailboxId;
  private String lastSynced;

  @Override
  public boolean equals(Object obj) {
    return doEquals(
        Sync.class,
        this,
        obj,
        (builder, right) -> builder
            .append(getMailboxId(), right.getMailboxId()));
  }

  @Override
  public int hashCode() {
    return new HashCodeBuilder()
        .append(getMailboxId())
        .hashCode();
  }

  public void setLastSynced(Date lastSynced) {
    this.lastSynced = from(lastSynced);
  }

  public Date lastSynced() {
    return parseDate(lastSynced);
  }
}
