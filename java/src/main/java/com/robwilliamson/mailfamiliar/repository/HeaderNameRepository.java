package com.robwilliamson.mailfamiliar.repository;

import com.robwilliamson.mailfamiliar.entity.HeaderName;
import org.springframework.data.repository.CrudRepository;

import java.util.Optional;

public interface HeaderNameRepository extends CrudRepository<HeaderName, Integer> {
  Optional<HeaderName> findByName(String name);
}
