package com.robwilliamson.mailfamiliar.entity;

import lombok.Data;

import javax.persistence.*;
import java.util.Date;

import static com.robwilliamson.mailfamiliar.repository.Time.*;

@Data
@Entity
@Table(name = "sync")
public class Sync {
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;
  private int mailboxId;
  private String lastSynced;

  public void setLastSynced(Date lastSynced) {
    this.lastSynced = from(lastSynced);
  }

  public Date lastSynced() {
    return parseDate(lastSynced);
  }
}
