package com.robwilliamson.mailfamiliar.events;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.service.predictor.Mistake;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class MistakeDetected extends ApplicationEvent {
  private final Id<Imap> imapAccountId;
  private final Mistake mistake;

  public MistakeDetected(Object source, Id<Imap> imapAccountId, Mistake mistake) {
    super(source);

    this.imapAccountId = imapAccountId;
    this.mistake = mistake;
  }
}
