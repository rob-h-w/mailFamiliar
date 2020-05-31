package com.robwilliamson.mailfamiliar.service;

import com.robwilliamson.mailfamiliar.entity.Encrypted;
import com.robwilliamson.mailfamiliar.entropy.RandomSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

@ExtendWith(SpringExtension.class)
@SpringBootTest
@Tag("Unit")
public class CryptoServiceTest {
  private static final String PLAINTEXT = "plaintext";
  private static final byte[] STRONG_RANDOM = new byte[]{0, 1, 2, 3, 4, 5};
  private static final byte[] WEAK_RANDOM = new byte[]{5, 4, 3, 2, 1, 0};

  @MockBean
  private RandomSource randomSource;

  @Autowired
  private CryptoService cryptoService;

  @BeforeEach
  public void setup() {
    when(randomSource.strongRandom(anyInt())).thenReturn(STRONG_RANDOM);
    when(randomSource.weakRandom(anyInt())).thenReturn(WEAK_RANDOM);
  }

  @Test
  public void encryptionWorks() {
    final Encrypted encryptedKey = cryptoService.createEncryptedKey();
    final Encrypted cipherText = cryptoService.encrypt(encryptedKey, PLAINTEXT.getBytes());

    assertNotNull(cipherText);
    assertArrayEquals(PLAINTEXT.getBytes(), cryptoService.decrypt(encryptedKey, cipherText));
  }

  @Test
  public void keyGenerationIsEncrypted() {
    final Encrypted encryptedKey = cryptoService.createEncryptedKey();

    assertNotEquals(encryptedKey.getCiphertext(), STRONG_RANDOM);
    assertArrayEquals(encryptedKey.getNonce(), STRONG_RANDOM);
    assertArrayEquals(encryptedKey.getSalt(), WEAK_RANDOM);
  }
}
