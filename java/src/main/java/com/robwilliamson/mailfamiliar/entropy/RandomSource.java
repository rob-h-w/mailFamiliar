package com.robwilliamson.mailfamiliar.entropy;

public interface RandomSource {
  byte[] strongRandom(int length);

  byte[] weakRandom(int length);
}
