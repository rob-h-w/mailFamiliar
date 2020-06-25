package com.robwilliamson.mailfamiliar.entity;

import lombok.Data;

import javax.persistence.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Data
@Entity
@Table(name = "sync")
public class Sync {
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;
  private int mailboxId;
  private String lastSynced;

  public void setLastSynced(LocalDateTime lastSynced) {
    this.lastSynced =
        lastSynced
            .format(DateTimeFormatter.ISO_DATE_TIME)
            .toUpperCase()
            .replace('T', ' ');
  }

  public LocalDateTime lastSynced() {
    return LocalDateTime.parse(lastSynced
        .replace(' ', 'T'));
  }
}
