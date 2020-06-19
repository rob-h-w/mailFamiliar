package com.robwilliamson.mailfamiliar.service;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.entropy.RandomSource;
import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.model.Id;
import com.robwilliamson.mailfamiliar.repository.*;
import org.flywaydb.test.annotation.FlywayTest;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

@FlywayTest
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

  @Autowired
  private EncryptedRepository encryptedRepository;

  @Autowired
  private UserRepository userRepository;

  @FlywayTest
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

  @Nested
  class StringEncryption {
    private Encrypted secret;
    private User user;

    @BeforeEach
    void setUp() {
      secret = cryptoService.createEncryptedKey();
      secret = encryptedRepository.save(secret);
      user = User.builder()
          .name("Rob")
          .remoteId("Rob's auth ID")
          .secret(secret.getId())
          .build();
      user = userRepository.save(user);
    }

    @Test
    void canEncryptWithUsersKey() throws MissingSecretException, MissingUserException {
      Encrypted ciphertext = cryptoService.encrypt(
          Id.of(user.getId(), User.class), PLAINTEXT);
      ciphertext = encryptedRepository.save(ciphertext);
      assertEquals(PLAINTEXT, cryptoService.decrypt(
          Id.of(user.getId(), User.class),
          Id.of(ciphertext.getId(), Encrypted.class)));
    }
  }
}
