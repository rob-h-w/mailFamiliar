package com.robwilliamson.mailfamiliar.repository;

import com.robwilliamson.mailfamiliar.entity.MoveState;
import org.springframework.data.repository.CrudRepository;

import java.util.Collection;

public interface MoveStateRepository extends CrudRepository<MoveState, Integer> {
  Collection<MoveState> findAllByStateIn(Collection<MoveState.State> states);
}
