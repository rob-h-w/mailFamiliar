package com.robwilliamson.mailfamiliar.service;

import com.robwilliamson.mailfamiliar.authorization.AuthorizedUser;
import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.repository.*;
import org.flywaydb.test.FlywayTestExecutionListener;
import org.flywaydb.test.annotation.FlywayTest;
import org.flywaydb.test.junit5.annotation.FlywayTestExtension;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener;

import java.util.*;
import java.util.stream.Collectors;

import static com.robwilliamson.test.Data.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@FlywayTestExtension
@FlywayTest
@SpringBootTest
@TestExecutionListeners({DependencyInjectionTestExecutionListener.class,
    FlywayTestExecutionListener.class})
class ImapAccountServiceTest {
  @Autowired
  ImapAccountService subject;

  @Autowired
  EncryptedRepository encryptedRepository;

  @Autowired
  ImapAccountRepository imapAccountRepository;

  @Autowired
  UserRepository userRepository;

  User userEntity1;
  AuthorizedUser authorizedUser1;
  Imap account1;
  Imap account2;

  @BeforeEach
  @FlywayTest
  void setUp() {
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
    userRepository.save(userEntity1);
    authorizedUser1 = new AuthorizedUser(mockOauth2User, "name", userEntity1);

    encrypted = encryptedRepository.save(encryptedEntity(10));
    account1 = imapAccountEntity("rob");
    account1.setUserId(userEntity1.getId());
    account1.setPassword(encrypted.getId());
    account1 = imapAccountRepository.save(account1);

    account2 = imapAccountEntity(2, encryptedRepository, userRepository);
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

  @Test
  void saveAccount() {
  }

  @Test
  void deleteAccount() {
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
}