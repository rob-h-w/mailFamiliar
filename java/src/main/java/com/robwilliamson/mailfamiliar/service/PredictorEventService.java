package com.robwilliamson.mailfamiliar.service;

import com.robwilliamson.mailfamiliar.events.*;
import com.robwilliamson.mailfamiliar.service.predictor.Predictor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import javax.transaction.Transactional;

@RequiredArgsConstructor
@Service
public class PredictorEventService {
  Predictor predictor;

  @EventListener
  @Transactional
  public void onImapMessageDeleted(ImapMessageDeleted imapMessageDeleted) {
    predictor.removeHeaders(
        imapMessageDeleted.getImapId(),
        imapMessageDeleted.getMessageEntity().getTypedMailboxId(),
        imapMessageDeleted.getImapHeaders());
  }

  @EventListener
  @Transactional
  public void onImapMessage(ImapMessage imapMessage) {
    predictor.addHeaders(
        imapMessage.getImapAccountId(),
        imapMessage.getMessage().getTypedMailboxId(),
        imapMessage.getImapHeaders());
  }

  @EventListener
  @Transactional
  public void onMistakeDetected(MistakeDetected mistakeDetected) {
    predictor.addMistake(
        mistakeDetected.getImapAccountId(),
        mistakeDetected.getMistake());
  }

  @EventListener
  @Transactional
  public void onMistakenMistake(MistakeMistaken mistakeMistaken) {
    predictor.removeMistake(
        mistakeMistaken.getImapAccountId(),
        mistakeMistaken.getMistake());
  }
}
