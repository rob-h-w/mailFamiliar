package com.robwilliamson.mailfamiliar.service.predictor;

import com.robwilliamson.mailfamiliar.entity.Mailbox;
import com.robwilliamson.mailfamiliar.model.Id;
import lombok.Data;

@Data
public class Mistake {
  private final Id<Mailbox> correctDestination;
  private final Move errantMove;
}
