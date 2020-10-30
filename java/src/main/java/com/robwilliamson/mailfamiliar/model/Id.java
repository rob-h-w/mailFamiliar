package com.robwilliamson.mailfamiliar.model;

import lombok.Data;

@Data
public class Id<T> {
  private final int value;

  public static <T> Id<T> of(int value, Class<T> clazz) {
    return new Id<T>(value);
  }
}
