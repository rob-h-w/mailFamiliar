package com.robwilliamson.test;

import java.util.function.Supplier;

public class Wait {
  private Wait() {
  }

  public static void until(Supplier<Boolean> predicate) throws InterruptedException {
    until(predicate, 500);
  }

  private static <T> void until(
      Supplier<Boolean> predicate,
      int timeoutMs) throws InterruptedException {
    until(predicate, timeoutMs, 10);
  }

  public static void until(Supplier<Boolean> predicate, int timeoutMs, int retries) throws InterruptedException {
    int remaining = retries;
    while (!predicate.get()) {
      assert remaining != 0 : "Waited " + retries + " times for condition to become true.";
      Thread.sleep(timeoutMs);
      remaining--;
    }
  }
}
