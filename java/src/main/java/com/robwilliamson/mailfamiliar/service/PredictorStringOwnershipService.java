package com.robwilliamson.mailfamiliar.service;

import com.robwilliamson.mailfamiliar.service.predictor.model.StringStore;
import com.robwilliamson.mailfamiliar.service.predictor.string.ownership.ServiceBackedStringStore;
import org.springframework.stereotype.Service;

@Service
public class PredictorStringOwnershipService {
  public StringStore stringStoreFor(String predictorName) {
    return new ServiceBackedStringStore(string -> hasStringAt(predictorName, string));
  }

  private Boolean hasStringAt(String predictorName, String string) {
    return null;
  }
}
