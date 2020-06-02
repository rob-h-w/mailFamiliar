package com.robwilliamson.mailfamiliar.config;

import com.robwilliamson.mailfamiliar.authorization.AuthorizedUser;
import com.robwilliamson.mailfamiliar.exceptions.UnsupportedAuthorizationServiceException;
import com.robwilliamson.mailfamiliar.repository.*;
import com.robwilliamson.mailfamiliar.service.CryptoService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.*;
import org.springframework.security.oauth2.client.userinfo.*;
import org.springframework.security.oauth2.core.user.OAuth2User;

import javax.transaction.Transactional;

@Configuration
@RequiredArgsConstructor
public class User {
  private static final int KEY_LENGTH = 128;
  private final CryptoService cryptoService;
  private final EncryptedRepository encryptedRepository;
  private final UserRepository userRepository;

  @Bean
  public OAuth2UserService<OAuth2UserRequest, AuthorizedUser> oAuth2UserOAuth2UserService() {
    final DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();
    return oAuth2UserRequest -> {
      final OAuth2User user = delegate.loadUser(oAuth2UserRequest);
      if (user.getAttributes().containsKey("url")
          && user.getAttribute("url").toString().startsWith("https://api.github.com/users")) {
        return gitHubUser(user);
      }

      throw new UnsupportedAuthorizationServiceException();
    };
  }

  @Transactional
  private AuthorizedUser gitHubUser(OAuth2User oAuth2User) {
    final String remoteId = "github.com" + oAuth2User.getAttribute("id");

    final com.robwilliamson.mailfamiliar.entity.User user = userRepository
        .findByRemoteId(remoteId)
        .orElseGet(() -> {
          final var secret = encryptedRepository.save(cryptoService.createEncryptedKey());
          return userRepository.save(
              com.robwilliamson.mailfamiliar.entity.User.builder()
                  .name(oAuth2User.getAttribute("name"))
                  .remoteId(remoteId)
                  .secret(secret.getId())
                  .build());
        });

    return new AuthorizedUser(oAuth2User, "name", user);
  }
}
