package com.robwilliamson.mailfamiliar.config;

import com.robwilliamson.mailfamiliar.authorization.AuthorizedUser;
import com.robwilliamson.mailfamiliar.exceptions.UnsupportedAuthorizationServiceException;
import com.robwilliamson.mailfamiliar.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.user.OAuth2User;

import javax.transaction.Transactional;

@Configuration
@RequiredArgsConstructor
public class User {
  private final UserRepository repository;

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

    final com.robwilliamson.mailfamiliar.entity.User user = repository
        .findByRemoteId(remoteId)
        .orElseGet(() -> repository.save(
            com.robwilliamson.mailfamiliar.entity.User.builder()
                .name(oAuth2User.getAttribute("name"))
                .remoteId(remoteId)
                .build()));

    return new AuthorizedUser(oAuth2User, "name", user);
  }
}
