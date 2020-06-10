package com.robwilliamson.test;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.repository.*;

import java.util.Random;

public class Data {
  private Data() {
  }

  public static Encrypted encryptedEntity(int seed) {
    final int length = 10;
    var random = new Random(seed);
    var entity = new Encrypted();
    entity.setSalt(new byte[length]);
    entity.setNonce(new byte[length]);
    entity.setCiphertext(new byte[length]);
    random.nextBytes(entity.getCiphertext());
    random.nextBytes(entity.getNonce());
    random.nextBytes(entity.getSalt());
    return entity;
  }

  public static User userEntity(String name) {
    var entity = new User();
    entity.setName(name);
    entity.setSecret(name.hashCode());
    entity.setRemoteId("remote " + name);
    return entity;
  }

  public static Imap imapAccountEntity(String name) {
    var entity = new Imap();
    entity.setHost(name + ".com");
    entity.setName(name);
    return entity;
  }

  public static Imap imapAccountEntity(
      int seed,
      EncryptedRepository encryptedRepository,
      UserRepository userRepository) {
    var random = new Random(seed);
    var name = base62(random, random.nextInt(15) + 1);
    var entity = imapAccountEntity(name);
    entity.setUserId(userRepository.save(userEntity(name)).getId());
    entity.setPassword(encryptedRepository.save(encryptedEntity(seed)).getId());
    return entity;
  }

  private static String base62(Random random, int length) {
    var bytes = new byte[length];
    var str = new StringBuilder(length);
    random.nextBytes(bytes);

    for (byte b : bytes) {
      int val = b % 62;
      if (val < 26) {
        str.append((char) ('a' + val));
        continue;
      }
      if (val < 52) {
        str.append((char) ('A' + val));
        continue;
      }

      str.append((char) ('0' + val));
    }

    return str.toString();
  }
}
