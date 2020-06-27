package com.robwilliamson.mailfamiliar.repository;

import com.robwilliamson.mailfamiliar.entity.Sync;
import org.springframework.data.repository.CrudRepository;

import java.util.Optional;

public interface SyncRepository extends CrudRepository<Sync, Integer> {
  Optional<Sync> findByMailboxId(int mailboxId);
}
