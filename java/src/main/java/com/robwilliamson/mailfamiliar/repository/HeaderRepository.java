package com.robwilliamson.mailfamiliar.repository;

import com.robwilliamson.mailfamiliar.entity.Header;
import org.springframework.data.repository.CrudRepository;

import java.util.Optional;

public interface HeaderRepository extends CrudRepository<Header, Integer> {
  Optional<Header> findByHeaderNameIdAndMessageId(int headerNameId, int messageId);

  Iterable<Header> findAllByMessageId(int messageId);

  void deleteAllByMessageId(int messageId);
}
