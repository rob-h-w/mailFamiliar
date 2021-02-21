package com.robwilliamson.mailfamiliar.service.predictor.string.ownership;

import com.robwilliamson.mailfamiliar.service.predictor.model.StringStore;
import lombok.RequiredArgsConstructor;

import java.util.function.Function;

@RequiredArgsConstructor
public class ServiceBackedStringStore implements StringStore {
  private final Function<String, Boolean> hasStringAt;

  @Override
  public boolean stringExists(String string) {
    return hasStringAt.apply(string);
  }
}
