package com.robwilliamson.mailfamiliar.entity;

import lombok.*;

import javax.persistence.*;

@AllArgsConstructor
@Builder
@Data
@Entity
@Getter
@NoArgsConstructor
@Table(name = "move_state")
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

  public enum State {
    Recorded,
    Copied,
    DeleteFlagged,
    Done
  }
}
