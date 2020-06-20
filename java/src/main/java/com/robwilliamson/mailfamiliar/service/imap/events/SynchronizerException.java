package com.robwilliamson.mailfamiliar.service.imap.events;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.model.Id;
import lombok.*;

import java.util.Optional;

@Getter
@RequiredArgsConstructor
public class SynchronizerException extends ImapEvent<SynchronizerException.Reason> {
  private final Id<Imap> imapAccountId;
  private final Reason reason;
  private final Optional<Throwable> throwable;

  public SynchronizerException(Id<Imap> imapAccountId) {
    this(imapAccountId, Reason.ClosedIntentionally, Optional.empty());
  }

  public SynchronizerException(Id<Imap> imapAccountId, Throwable throwable) {
    this(imapAccountId, Reason.ClosedUnexpectedly, Optional.of(throwable));
  }

  @Override
  public Reason getPayload() {
    return reason;
  }

  public enum Reason {
    ClosedIntentionally,
    ClosedUnexpectedly,
    CloseError,
    OpenFailed,
    ProgrammerError
  }
}

