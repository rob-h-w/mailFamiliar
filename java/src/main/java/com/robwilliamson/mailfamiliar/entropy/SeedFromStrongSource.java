package com.robwilliamson.mailfamiliar.entropy;

import org.springframework.core.task.TaskExecutor;

import java.security.*;
import java.util.Random;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.*;

public class SeedFromStrongSource implements RandomSource {
  private static final int WEAK_PER_STRONG = 200;
  private final Lock lock = new ReentrantLock();
  private final Condition entropyNeeded = lock.newCondition();
  private final Condition readingFinishedCondition = lock.newCondition();
  private final SecureRandom random;
  private final Random weakRandom = new Random();
  private final AtomicInteger weakReaderCount = new AtomicInteger();
  private final Condition writingFinishedCondition = lock.newCondition();
  private volatile boolean blockForWriting = false;
  private volatile AtomicInteger reads = new AtomicInteger();

  {
    try {
      random = SecureRandom.getInstanceStrong();
    } catch (NoSuchAlgorithmException e) {
      throw new RuntimeException(e);
    }
  }

  public SeedFromStrongSource(TaskExecutor taskExecutor) {
    taskExecutor.execute(() -> {
      while (true) {
        updateSeed(nextLong());
        try {
          awaitEntropyNeeded();
        } catch (InterruptedException ignored) {
          break;
        }
      }
    });
  }

  void updateSeed(long seed) {
    blockForWriting = true;

    lock.lock();

    try {
      while (weakReaderCount.get() > 0) {
        readingFinishedCondition.await();
      }

      weakRandom.setSeed(seed);
      reads.set(0);
      blockForWriting = false;
      writingFinishedCondition.signal();
    } catch (InterruptedException e) {
      throw new RuntimeException(e);
    } finally {
      lock.unlock();
    }
  }

  private void decrementWeakReaderCount() {
    if (weakReaderCount.decrementAndGet() == 0) {
      lock.lock();
      readingFinishedCondition.signal();
      lock.unlock();
    }
  }

  @Override
  public byte[] strongRandom(int length) {
    lock.lock();

    try {
      final var result = new byte[length];

      random.nextBytes(result);
      return result;
    } finally {
      lock.unlock();
    }
  }

  @Override
  public byte[] weakRandom(int length) {
    weakReaderCount.incrementAndGet();

    if (blockForWriting) {
      lock.lock();
      decrementWeakReaderCount();

      try {
        while (blockForWriting) {
          writingFinishedCondition.await();
        }

        weakReaderCount.incrementAndGet();
      } catch (InterruptedException e) {
        throw new RuntimeException(e);
      } finally {
        lock.unlock();
      }
    }

    final var result = new byte[length];
    weakRandom.nextBytes(result);
    decrementWeakReaderCount();

    if (reads.incrementAndGet() > WEAK_PER_STRONG) {
      lock.lock();
      entropyNeeded.signal();
      lock.unlock();
    }
    return result;
  }

  private long nextLong() {
    lock.lock();
    try {
      return random.nextLong();
    } finally {
      lock.unlock();
    }
  }

  private void awaitEntropyNeeded() throws InterruptedException {
    lock.lock();
    entropyNeeded.await();
    lock.unlock();
  }
}
