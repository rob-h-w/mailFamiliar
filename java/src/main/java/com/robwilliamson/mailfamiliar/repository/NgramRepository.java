package com.robwilliamson.mailfamiliar.repository;

import com.robwilliamson.mailfamiliar.entity.Ngram;
import org.springframework.data.repository.CrudRepository;

import java.util.Optional;

public interface NgramRepository extends CrudRepository<Ngram, Long> {
  Optional<Ngram> findDistinctByName(String name);
}
