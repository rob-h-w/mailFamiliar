package com.robwilliamson.mailfamiliar.service.predictor.model;

import com.robwilliamson.mailfamiliar.exceptions.StringAbsentException;

public interface StringAnalyzer {
  void add(String string);

  void remove(String string) throws StringAbsentException;
}
