package com.robwilliamson.mailfamiliar.repository;

import com.robwilliamson.mailfamiliar.entity.Message;
import org.springframework.data.repository.CrudRepository;

import java.util.Optional;

public interface MessageRepository extends CrudRepository<Message, Integer> {
  Optional<Message> findByFromHashAndMailboxIdAndReceivedDateAndSentDate(
      int fromHash,
      int mailboxId,
      String receivedDate,
      String sentDate);

  default Optional<Message> findByExample(Message example) {
    return findByFromHashAndMailboxIdAndReceivedDateAndSentDate(
        example.getFromHash(),
        example.getMailboxId(),
        example.getReceivedDate(),
        example.getSentDate());
  }
}
