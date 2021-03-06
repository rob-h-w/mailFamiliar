package com.robwilliamson.mailfamiliar.repository;

import com.robwilliamson.mailfamiliar.entity.Imap;
import org.springframework.data.repository.CrudRepository;

import java.util.Collection;

public interface ImapAccountRepository extends CrudRepository<Imap, Integer> {
  Collection<Imap> findByUserId(int userId);
}
