package com.robwilliamson.mailfamiliar.repository;

import com.robwilliamson.mailfamiliar.entity.Encrypted;
import org.springframework.data.repository.CrudRepository;

public interface EncryptedRepository extends CrudRepository<Encrypted, Integer> {
}
