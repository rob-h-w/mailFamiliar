package com.robwilliamson.mailfamiliar.events;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.model.Id;
import lombok.Getter;

import java.util.Optional;

@Getter
public class SynchronizerException extends ImapEvent {
  private final Reason reason;
  private final Optional<Throwable> throwable;

  public SynchronizerException(
      Object source,
      Id<Imap> imapAccountId,
      Reason reason,
      Optional<Throwable> throwable) {
    super(source, imapAccountId);
    this.reason = reason;
    this.throwable = throwable;
  }

  public static Builder builder(Object source, Id<Imap> imapAccountId) {
    return new Builder(source, imapAccountId);
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
    private final Object source;
    private final Id<Imap> imapAccountId;
    private Reason reason = Reason.Error;
    private Throwable throwable;

    private Builder(Object source, Id<Imap> imapAccountId) {
      this.source = source;
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
      return new SynchronizerException(
          source,
          imapAccountId,
          reason,
          Optional.ofNullable(throwable));
    }

    public Builder reason(Reason reason) {
      this.reason = reason;
      return this;
    }
  }
}

