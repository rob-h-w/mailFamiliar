package com.robwilliamson.mailfamiliar.repository;

import com.robwilliamson.mailfamiliar.entity.Mailbox;
import com.robwilliamson.mailfamiliar.exceptions.FolderRecordMissingException;
import org.springframework.data.repository.CrudRepository;

import java.util.*;

public interface MailboxRepository extends CrudRepository<Mailbox, Integer> {
  void deleteByImapAccountId(int imapAccountId);

  Collection<Mailbox> findByImapAccountId(int imapAccountId);

  Optional<Mailbox> findByNameAndImapAccountId(String name, int value);

  default Mailbox getById(int mailboxId) throws FolderRecordMissingException {
    return findById(mailboxId)
        .orElseThrow(() -> new FolderRecordMissingException(mailboxId));
  }
}
