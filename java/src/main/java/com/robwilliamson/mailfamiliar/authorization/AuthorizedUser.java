package com.robwilliamson.mailfamiliar.authorization;

import com.robwilliamson.mailfamiliar.entity.User;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;

public class AuthorizedUser extends DefaultOAuth2User {
  public final AuthServer authorizationServer = AuthServer.GITHUB;
  private final User user;

  public AuthorizedUser(OAuth2User oAuth2User, String nameAttributeKey, User user) {
    super(oAuth2User.getAuthorities(), oAuth2User.getAttributes(), nameAttributeKey);
    this.user = user;
  }

  public User user() {
    return user;
  }

  public enum AuthServer {
    GITHUB
  }
}
