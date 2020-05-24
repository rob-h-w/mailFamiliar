package com.robwilliamson.mailfamiliar.repository;

import com.robwilliamson.mailfamiliar.entity.User;
import org.springframework.data.repository.CrudRepository;

import java.util.Optional;

public interface UserRepository extends CrudRepository<User, Long> {
  Optional<User> findByRemoteId(String remoteId);
}
