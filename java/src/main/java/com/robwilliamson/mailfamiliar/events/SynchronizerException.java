package com.robwilliamson.mailfamiliar.events;

import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.exceptions.FromMissingException;
import com.robwilliamson.mailfamiliar.model.Id;
import lombok.Getter;
import org.springframework.context.ApplicationEventPublisher;

import javax.mail.MessagingException;
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

  public static void tryAndPublish(SyncJob syncJob,
                                   ApplicationEventPublisher eventPublisher) {
    try {
      syncJob.run();
    } catch (MessagingException | FromMissingException e) {
      eventPublisher.publishEvent(SynchronizerException
          .builder(syncJob.parent(), syncJob.imapAccountId())
          .throwable(e)
          .reason(SynchronizerException.Reason.ClosedUnexpectedly)
          .build());
    } catch (InterruptedException e) {
      if (syncJob.closing()) {
        eventPublisher.publishEvent(SynchronizerException
            .builder(syncJob.parent(), syncJob.imapAccountId())
            .throwable(e)
            .reason(SynchronizerException.Reason.ClosedUnexpectedly)
            .build());
      } else {
        eventPublisher.publishEvent(SynchronizerException
            .builder(syncJob.parent(), syncJob.imapAccountId())
            .closedIntentionally()
            .build());
      }
    } catch (Throwable e) {
      eventPublisher.publishEvent(SynchronizerException
          .builder(syncJob.parent(), syncJob.imapAccountId())
          .throwable(e)
          .build());
      throw e;
    }
  }

  public enum Reason {
    ClosedIntentionally,
    ClosedUnexpectedly,
    CloseError,
    Error,
    OpenError,
    ProgrammerError
  }

  public interface SyncJob {
    boolean closing();

    Id<Imap> imapAccountId();

    Object parent();

    void run() throws MessagingException, FromMissingException, InterruptedException;
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

