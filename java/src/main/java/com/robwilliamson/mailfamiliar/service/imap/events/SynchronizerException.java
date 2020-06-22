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

  public static Builder builder(Id<Imap> imapAccountId) {
    return new Builder(imapAccountId);
  }

  @Override
  public Reason getPayload() {
    return reason;
  }

  public enum Reason {
    ClosedIntentionally,
    ClosedUnexpectedly,
    CloseError,
    Error,
    OpenError,
    ProgrammerError
  }

  public static class Builder {
    private final Id<Imap> imapAccountId;
    private Reason reason = Reason.Error;
    private Throwable throwable;

    private Builder(Id<Imap> imapAccountId) {
      this.imapAccountId = imapAccountId;
    }

    public Builder closedIntentionally() {
      return reason(Reason.ClosedIntentionally);
    }

    public Builder throwable(Throwable throwable) {
      this.throwable = throwable;
      return this;
    }

    public SynchronizerException build() {
      return new SynchronizerException(imapAccountId, reason, Optional.ofNullable(throwable));
    }

    public Builder reason(Reason reason) {
      this.reason = reason;
      return this;
    }
  }
}

