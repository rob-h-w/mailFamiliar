package com.robwilliamson.mailfamiliar.service.predictor.model;

import java.util.*;
import java.util.function.*;

public class AdjacencyTable {
  public static final String START = "Start";
  public static final String END = "End";
  private static final BiFunction<String, Integer, Integer> ADD_KEY =
      (key, oldValue) -> oldValue == null ? 1 : oldValue + 1;
  private static final BiFunction<String, Integer, Integer> REMOVE_KEY =
      (key, oldValue) -> oldValue == null ? 0 : Math.max(0, oldValue - 1);

  long total;
  Map<String, Integer> count = new HashMap<>();
  Map<String, Integer> individualTotals = new HashMap<>();

  public void add(String string) {
    mutate(string, this::increment);
  }

  private void mutate(String string, BiConsumer<String, String> mutator) {
    visit(string, (key, individual) -> {
      mutator.accept(key, individual);
      return 0d;
    });
    total = Math.max(total, 0);
  }

  private List<Double> visit(String string, ToDoubleBiFunction<String, String> visitor) {
    if (string == null || string.isEmpty()) {
      return List.of();
    }

    List<Double> result = new ArrayList<>(string.length() + 1);
    String previous = "" + string.charAt(0);
    result.add(visitor.applyAsDouble(START + previous, START));

    for (int i = 1; i < string.length(); i++) {
      final String next = "" + string.charAt(i);
      result.add(visitor.applyAsDouble("" + previous + next, previous));
      previous = next;
    }

    result.add(visitor.applyAsDouble(previous + END, previous));

    return result;
  }

  private void increment(String key, String individual) {
    count.compute(key, ADD_KEY);
    individualTotals.compute(individual, ADD_KEY);
    total++;

    if (key.endsWith(END)) {
      individualTotals.compute(END, ADD_KEY);
    }
  }

  private void decrement(String key, String individual) {
    count.compute(key, REMOVE_KEY);
    individualTotals.compute(individual, REMOVE_KEY);
    total--;

    if (key.endsWith(END)) {
      individualTotals.compute(END, REMOVE_KEY);
    }
  }

  public int countFor(String combination) {
    return count.getOrDefault(combination, 0);
  }

  public int countFor(char first, char second) {
    return countFor("" + first + second);
  }

  public int countFor(char c) {
    return individualTotals.getOrDefault("" + c, 0);
  }

  public int startCount() {
    return individualTotals.getOrDefault(START, 0);
  }

  public int endCount() {
    return individualTotals.getOrDefault(END, 0);
  }

  public long getTotal() {
    return total;
  }

  public void remove(String string) {
    mutate(string, this::decrement);
  }

  public void removeStrict(String string) throws StringAbsentException {
    if (string == null || string.isEmpty()) {
      return;
    }

    final Map<Character, Integer> characterCount = new HashMap<>();
    for (char c : string.toCharArray()) {
      characterCount.compute(c, (key, oldCount) -> oldCount == null ? 1 : oldCount + 1);
    }

    for (char c : characterCount.keySet()) {
      if (countFor(c) < characterCount.get(c)) {
        throw new StringAbsentException();
      }
    }

    if (countFor(START + string.charAt(0)) < 1
        || countFor(string.charAt(string.length() - 1) + END) < 1) {
      throw new StringAbsentException();
    }

    remove(string);
  }

  public double probabilityOf(String string) {
    List<Double> pairScores = visit(string,
        (key, individual) -> {
          double denominator = individualTotals.getOrDefault(individual, 0);
          if (denominator == 0) {
            return 0d;
          }

          return countFor(key) / denominator;
        });
    return pairScores.isEmpty()
        ? 0d
        : pairScores.stream().reduce(Double::sum).orElse(0d) / pairScores.size();
  }

  public static class StringAbsentException extends Throwable {
  }
}
