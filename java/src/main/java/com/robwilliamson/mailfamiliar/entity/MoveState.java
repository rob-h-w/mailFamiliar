package com.robwilliamson.mailfamiliar.entity;

import lombok.*;
import org.apache.commons.lang3.builder.HashCodeBuilder;

import javax.persistence.*;

import static com.robwilliamson.mailfamiliar.Equals.doEquals;

@AllArgsConstructor
@Builder
@Entity
@Getter
@NoArgsConstructor
@Setter
@Table(name = "move_state")
@ToString
public class MoveState {
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;
  @With
  private State state;
  @OneToOne(fetch = FetchType.EAGER)
  private Message message;
  @OneToOne
  private Mailbox from;
  @OneToOne
  private Mailbox to;

  @Override
  public boolean equals(Object obj) {
    return doEquals(
        MoveState.class,
        this,
        obj,
        (builder, right) -> builder
            .append(getFrom(), right.getFrom())
            .append(getMessage(), right.getMessage())
            .append(getTo(), right.getTo()));
  }

  @Override
  public int hashCode() {
    return new HashCodeBuilder()
        .append(getFrom())
        .append(getMessage())
        .append(getTo())
        .hashCode();
  }

  public enum State {
    Recorded,
    Copied,
    DeleteFlagged,
    Done
  }
}
