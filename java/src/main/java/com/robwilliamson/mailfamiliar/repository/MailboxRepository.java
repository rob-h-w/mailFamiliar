package com.robwilliamson.mailfamiliar.repository;

import com.robwilliamson.mailfamiliar.entity.Mailbox;
import org.springframework.data.repository.Repository;

import java.util.Collection;

public interface MailboxRepository extends Repository<Mailbox, Integer> {
  Collection<Mailbox> findByImapAccountId(int imapAccountId);
}
