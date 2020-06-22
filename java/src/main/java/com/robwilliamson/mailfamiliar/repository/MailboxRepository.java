package com.robwilliamson.mailfamiliar.repository;

import com.robwilliamson.mailfamiliar.entity.Mailbox;
import org.springframework.data.repository.CrudRepository;

import java.util.*;

public interface MailboxRepository extends CrudRepository<Mailbox, Integer> {
  Collection<Mailbox> findByImapAccountId(int imapAccountId);

  Optional<Mailbox> findByNameAndImapAccountId(String name, int value);
}
