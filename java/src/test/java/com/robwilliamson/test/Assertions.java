package com.robwilliamson.test;

import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.fail;

public class Assertions {
  private Assertions() {
  }

  public static <T> void assertContains(Set<T> expected, Set<T> actual) {
    if (expected != actual && actual == null) {
      fail("expected " + expected + ", but received " + actual);
    }

    final Set<T> missing = expected
        .stream()
        .filter(ex -> !actual.contains(ex))
        .collect(Collectors.toSet());

    if (!missing.isEmpty()) {
      fail("expected " + expected + ", but actual is missing " + missing);
    }
  }

  public static <T> void assertContains(T expected, Collection<T> actual) {
    assert actual != null;
    if (!actual.contains(expected)) {
      fail("expected " + actual + " to contain " + expected);
    }
  }
}
