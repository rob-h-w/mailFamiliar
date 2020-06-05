package com.robwilliamson.mailfamiliar.repository;

import com.robwilliamson.mailfamiliar.entity.Mailbox;

import java.util.Collection;

public interface MailboxRepository {
  Collection<Mailbox> findByImapAccontId(int imapAccountId);
}
