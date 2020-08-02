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
  private static final Function<String, BiFunction<String, HashSet<String>, HashSet<String>>>
      ADD_PAIR = (pair) -> (part, existing) -> {
    if (existing == null) {
      return new HashSet<>(List.of(pair));
    }
    existing.add(pair);
    return existing;
  };
  private static final BiFunction<String, Integer, BiFunction<String, HashSet<String>,
      HashSet<String>>> REMOVE_PAIR = (pair, count) -> (part, existing) -> {
    if (count == 0) {
      existing.remove(pair);
    }
    return existing;
  };
  private static final double LOG_2 = Math.log(2);
  long total;
  Map<String, Integer> count = new HashMap<>();
  Map<String, Integer> individualTotals = new HashMap<>();
  Map<String, HashSet<String>> pairByFirst = new HashMap<>();

  private static double log2(double value) {
    return Math.log(value) / LOG_2;
  }

  private static String secondSymbol(String firstSymbol, String pair) {
    return pair.substring(firstSymbol.length());
  }

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
    pairByFirst.compute(individual, ADD_PAIR.apply(key));
    total++;

    if (key.endsWith(END)) {
      individualTotals.compute(END, ADD_KEY);
    }
  }

  private void decrement(String key, String individual) {
    count.compute(key, REMOVE_KEY);
    individualTotals.compute(individual, REMOVE_KEY);
    pairByFirst.compute(individual, REMOVE_PAIR.apply(key, count.get(key)));
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
        (key, individual) -> pOf(individual, key));
    return pairScores.isEmpty()
        ? 0d
        : pairScores.stream().reduce(Double::sum).orElse(0d) / pairScores.size();
  }

  public double entropyBits() {
    if (individualTotals.isEmpty()) {
      return 0;
    }
    if (total - individualTotals.get(START) <= 0) {
      return 0;
    }
    return -(individualTotals.keySet()
        .stream()
        .flatMapToDouble(first -> pairByFirst.getOrDefault(first, new HashSet<>())
            .stream()
            .mapToDouble(pair -> {
              final double p = Math.min(1.0, pOf(first, pair));
              if (p == 0) {
                return 0;
              }
              return p * log2(p);
            }))
        .reduce(0, Double::sum));
  }

  private double pOf(String first, String pair) {
    double denominator = individualTotals.getOrDefault(first, 0);
    if (denominator == 0) {
      return 0d;
    }

    return countFor(pair) / denominator;
  }

  public static class StringAbsentException extends Throwable {
  }
}
