package com.robwilliamson.mailfamiliar.service;

import com.robwilliamson.mailfamiliar.authorization.AuthorizedUser;
import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.events.*;
import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.repository.*;
import com.robwilliamson.test.EventReceiver;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.*;
import java.util.stream.Collectors;

import static com.robwilliamson.test.Data.*;
import static com.robwilliamson.test.Wait.until;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SpringBootTest
class ImapAccountServiceTest {
  @Autowired
  CryptoService cryptoService;

  @Autowired
  Flyway flyway;

  @Autowired
  ImapAccountService subject;

  @Autowired
  EncryptedRepository encryptedRepository;

  @MockBean
  EventReceiver eventReceiver;

  @Autowired
  ImapAccountRepository imapAccountRepository;

  @Autowired
  UserRepository userRepository;

  User userEntity1;
  AuthorizedUser authorizedUser1;
  Imap account1;
  Imap account2;

  @BeforeEach
  void setUp() {
    flyway.migrate();
    GrantedAuthority mockGrantedAuthority = mock(GrantedAuthority.class);
    when(mockGrantedAuthority.getAuthority()).thenReturn("respect mah authoritah.");
    OAuth2User mockOauth2User = mock(OAuth2User.class);
    doReturn(List.of(mockGrantedAuthority)).when(mockOauth2User).getAuthorities();
    when(mockOauth2User.getAttributes()).thenReturn(Map.of(
        "url", "thing",
        "name", "hoots"));

    var encrypted = encryptedRepository.save(encryptedEntity(1));
    userEntity1 = userEntity("Rob");
    userEntity1.setSecret(encrypted.getId());
    userEntity1 = userRepository.save(userEntity1);
    authorizedUser1 = new AuthorizedUser(mockOauth2User, "name", userEntity1);

    encrypted = encryptedRepository.save(encryptedEntity(10));
    account1 = imapAccountEntity("rob");
    account1.setUserId(userEntity1.getId());
    account1.setPassword(encrypted.getId());
    account1 = imapAccountRepository.save(account1);

    account2 = imapAccountEntity(2, encryptedRepository, userRepository);
  }

  @AfterEach
  void tearDown() {
    flyway.clean();
  }

  @Test
  void getAccounts_returnsCurrentAccounts() {
    var accounts = subject.getAccounts().collect(Collectors.toList());
    assertEquals(1, accounts.size());
    var account = accounts.get(0);
    assertEquals("rob", account.getName());
    assertEquals("rob.com", account.getHost());
    assertEquals(1, account.getUserId());
  }

  @Nested
  class DeleteAccount {
    @BeforeEach
    void setUp() {
      subject.deleteAccount(account1.getId());
    }

    @Test
    void encryptedDataIsDeleted() {
      assertEquals(Optional.empty(), encryptedRepository.findById(account1.getPassword()));
    }
  }

  @Nested
  class SaveAccount {
    @BeforeEach
    void setUp() throws MissingUserException, MissingSecretException, InterruptedException {

      final var secret = encryptedRepository.save(cryptoService.createEncryptedKey());
      final User user = userRepository.save(
          User.builder()
              .name("Rufus")
              .remoteId("Still Rufus")
              .secret(secret.getId())
              .build());
      subject.saveAccount(
          user,
          imapAccountEntity("Rufus"),
          "Hoodliboo");
      ArgumentCaptor<Object> argumentCaptor =
          ArgumentCaptor.forClass(Object.class);
      until(() -> {
        verify(eventReceiver, atLeast(0))
            .onEvent(argumentCaptor.capture());
        return argumentCaptor.getAllValues()
            .stream()
            .filter(event -> event instanceof ImapEvent)
            .count() > 0;
      });
    }

    @Test
    void publishesNewAccountEvent() {
      verify(eventReceiver, times(1))
          .onEvent(any(NewImapAccount.class));
    }
  }
}