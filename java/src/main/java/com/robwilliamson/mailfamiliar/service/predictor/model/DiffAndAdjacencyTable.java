package com.robwilliamson.mailfamiliar.service.predictor.model;

import com.robwilliamson.mailfamiliar.exceptions.StringAbsentException;

public class DiffAndAdjacencyTable implements EntropyMeasured, StringAnalyzer {
  @Override
  public double entropyBits() {
    return 0;
  }

  @Override
  public void add(String string) {

  }

  @Override
  public void remove(String string) throws StringAbsentException {

  }
}
