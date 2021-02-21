package com.robwilliamson.mailfamiliar.service.predictor;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.repository.NgramRepository;
import com.robwilliamson.mailfamiliar.service.PredictorStringOwnershipService;
import com.robwilliamson.mailfamiliar.service.imap.ImapHeaders;
import com.robwilliamson.mailfamiliar.service.predictor.model.Ngram;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
@RequiredArgsConstructor
public class NgramPredictor implements Predictor {
  private final NgramRepository ngramRepository;
  private final PredictorStringOwnershipService predictorStringOwnershipService;
  private final Map<Id<Imap>, Map<Id<Mailbox>, Map<String, Ngram>>> ngModels = new HashMap<>();
  private final Map<Ngram, com.robwilliamson.mailfamiliar.entity.Ngram> ngramsByModel =
      new HashMap<>();

  @Override
  public void addHeaders(Id<Imap> accountId, Id<Mailbox> mailboxId, ImapHeaders headers) {
    headers
        .stream()
        .forEach(pair -> getNgramModelFor(
            accountId,
            mailboxId,
            pair.getFirst()).add(pair.getSecond()));
  }

  @Override
  public void addMistake(Id<Imap> accountId, Mistake mistake) {

  }

  @Override
  public Map<Id<Mailbox>, Double> folderScoresFor(Id<Imap> accountId, ImapHeaders headers) {
    return null;
  }

  @Override
  public void removeHeaders(Id<Imap> accountId, Id<Mailbox> mailboxId, ImapHeaders headers) {

  }

  @Override
  public void removeMistake(Id<Imap> accountId, Mistake mistake) {

  }

  private String ngramName(Id<Imap> accountId, Id<Mailbox> mailboxId, String header) {
    return String.join(".", List.of(
        String.valueOf(accountId.getValue()),
        String.valueOf(mailboxId.getValue()),
        header));
  }

  private synchronized Ngram getNgramModelFor(Id<Imap> accountId, Id<Mailbox> mailboxId, String header) {
    final Map<String, Ngram> ngramsByHeader = getNgramsFor(accountId, mailboxId);

    if (ngramsByHeader.containsKey(header)) {
      return ngramsByHeader.get(header);
    }

    final String ngramName = ngramName(accountId, mailboxId, header);

    final Optional<com.robwilliamson.mailfamiliar.entity.Ngram> optionalNgram =
        ngramRepository.findDistinctByName(ngramName);

    com.robwilliamson.mailfamiliar.entity.Ngram ngram =
        optionalNgram.orElse(new com.robwilliamson.mailfamiliar.entity.Ngram());
    ngram.setName(ngramName);
    ngram = ngramRepository.save(ngram);
    final Ngram ngramModel = ngram.toModel(
        predictorStringOwnershipService.stringStoreFor(ngramName));
    ngramsByHeader.put(header, ngramModel);
    ngramsByModel.put(ngramModel, ngram);
    return ngramModel;
  }

  private synchronized Map<String, Ngram> getNgramsFor(Id<Imap> accountId, Id<Mailbox> mailboxId) {
    final Map<Id<Mailbox>, Map<String, Ngram>> ngramsByMailbox = getNgramsByMailboxFor(accountId);

    if (ngramsByMailbox.containsKey(mailboxId)) {
      return ngramsByMailbox.get(mailboxId);
    }

    final Map<String, Ngram> ngramsByHeader = new HashMap<>();
    ngramsByMailbox.put(mailboxId, ngramsByHeader);
    return ngramsByHeader;
  }

  private synchronized Map<Id<Mailbox>, Map<String, Ngram>> getNgramsByMailboxFor(
      Id<Imap> accountId) {
    if (ngModels.containsKey(accountId)) {
      return ngModels.get(accountId);
    }

    final Map<Id<Mailbox>, Map<String, Ngram>> ngramsByMailbox = new HashMap<>();
    ngModels.put(accountId, ngramsByMailbox);
    return ngramsByMailbox;
  }
}
