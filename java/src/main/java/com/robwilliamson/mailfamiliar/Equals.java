package com.robwilliamson.mailfamiliar;

import org.apache.commons.lang.builder.EqualsBuilder;

import java.util.function.BiFunction;

public class Equals {
  private Equals() {
  }

  public static <T> boolean doEquals(
      Class<T> clazz,
      T left,
      Object right,
      BiFunction<EqualsBuilder, T, EqualsBuilder> equalsBuilderConfigurer) {
    if (left == right) {
      return true;
    }

    if (!clazz.isInstance(right)) {
      return false;
    }

    return equalsBuilderConfigurer
        .apply(new EqualsBuilder(), clazz.cast(right))
        .isEquals();
  }
}
