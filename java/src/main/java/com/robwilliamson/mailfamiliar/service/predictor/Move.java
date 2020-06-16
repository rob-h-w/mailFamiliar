package com.robwilliamson.mailfamiliar.service.predictor;

import com.robwilliamson.mailfamiliar.entity.Mailbox;
import com.robwilliamson.mailfamiliar.model.Id;
import lombok.Data;

import java.time.LocalDate;

@Data
public class Move {
  private final Id<Mailbox> destination;
  private final Message message;
  private final LocalDate moveTime;
}
