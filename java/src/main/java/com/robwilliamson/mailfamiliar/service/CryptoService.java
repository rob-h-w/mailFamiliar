package com.robwilliamson.mailfamiliar.service;

import com.nimbusds.jose.util.Base64;
import com.robwilliamson.mailfamiliar.entity.Encrypted;
import com.robwilliamson.mailfamiliar.entropy.RandomSource;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.InvalidAlgorithmParameterException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.security.NoSuchProviderException;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.KeySpec;

@RequiredArgsConstructor
@Service
public class CryptoService {
  public static final int AES_KEY_SIZE = 128;
  public static final int GCM_TAG_LENGTH = 16;
  public static final int ITERATION_COUNT = Short.MAX_VALUE * 2;
  private static final String PEPPER = "4w9508yhwknwj54hg. w54kg9ae az.ku 54etihu45t4i3t34uhlizsd" +
      ".'rsa][8t976tf'[09}POI`frm.SEn<";
  private final Environment environment;
  private final RandomSource randomSource;
  private SecretKeyFactory factory;
  private SecretKey masterSecret;

  {
    try {
      factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
    } catch (NoSuchAlgorithmException e) {
      throw new RuntimeException(e);
    }
  }

  private static KeySpec keySpecFor(char[] key, byte[] salt) {
    return new PBEKeySpec(
        key,
        salt,
        ITERATION_COUNT,
        AES_KEY_SIZE);
  }

  private static GCMParameterSpec specFor(byte[] nonce) {
    return new GCMParameterSpec(GCM_TAG_LENGTH * 8, nonce);
  }

  private static Cipher getCipher() {
    try {
      return Cipher.getInstance("AES/GCM/NoPadding", "SunJCE");
    } catch (NoSuchPaddingException
        | NoSuchProviderException
        | NoSuchAlgorithmException e) {
      throw new RuntimeException(e);
    }
  }

  private SecretKey generateSecret(char[] key, byte[] salt) {
    try {
      return new SecretKeySpec(
          factory
              .generateSecret(keySpecFor(key, salt))
              .getEncoded(),
          "AES");
    } catch (InvalidKeySpecException e) {
      throw new RuntimeException(e);
    }
  }

  private byte[] createKey() {
    return randomSource.strongRandom(AES_KEY_SIZE);
  }

  private byte[] createSalt() {
    return randomSource.weakRandom(AES_KEY_SIZE);
  }

  private char[] decryptKey(Encrypted encryptedKey) {
    return Base64.encode(decrypt(masterSecret(), encryptedKey)).toString().toCharArray();
  }

  public byte[] decrypt(Encrypted encryptedKey, Encrypted encrypted) {
    return decrypt(decryptKey(encryptedKey), encrypted);
  }

  public byte[] decrypt(char[] key, Encrypted encrypted) {
    return decrypt(generateSecret(key, encrypted.getSalt()), encrypted);
  }

  public byte[] decrypt(SecretKey secretKey, Encrypted encrypted) {
    final Cipher cipher = getCipher();
    try {
      cipher.init(Cipher.DECRYPT_MODE, secretKey, specFor(encrypted.getNonce()));
      return cipher.doFinal(encrypted.getCiphertext());
    } catch (InvalidAlgorithmParameterException
        | InvalidKeyException
        | IllegalBlockSizeException
        | BadPaddingException e) {
      throw new RuntimeException(e);
    }
  }

  public Encrypted encrypt(Encrypted encryptedKey, byte[] value) {
    return encrypt(decryptKey(encryptedKey), value);
  }

  public Encrypted encrypt(char[] key, byte[] value) {
    final byte[] salt = createKey();
    return encrypt(generateSecret(key, salt), salt, value);
  }

  public Encrypted encrypt(SecretKey secretKey, byte[] salt, byte[] value) {
    try {
      final Cipher cipher = getCipher();
      final byte[] nonce = randomSource.strongRandom(Encrypted.GCM_NONCE_LENGTH);
      cipher.init(Cipher.ENCRYPT_MODE, secretKey, specFor(nonce));
      final byte[] encrypted = cipher.doFinal(value);
      return Encrypted.builder()
          .ciphertext(encrypted)
          .nonce(nonce)
          .salt(salt)
          .build();
    } catch (IllegalBlockSizeException
        | BadPaddingException
        | InvalidKeyException
        | InvalidAlgorithmParameterException e) {
      throw new RuntimeException(e);
    }
  }

  public Encrypted createEncryptedKey() {
    return encrypt(masterSecret(), createSalt(), createKey());
  }

  public String masterKey() {
    final String key = environment.getProperty("MAIL_FAMILIAR_KEY");
    assert key != null : "MAIL_FAMILIAR_KEY must be provided";
    return key;
  }

  public SecretKey masterSecret() {
    if (masterSecret == null) {
      masterSecret = generateSecret(masterKey().toCharArray(), PEPPER.getBytes());
    }

    return masterSecret;
  }
}
