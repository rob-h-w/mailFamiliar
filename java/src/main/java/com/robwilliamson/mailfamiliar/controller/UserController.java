package com.robwilliamson.mailfamiliar.controller;


import com.robwilliamson.mailfamiliar.authorization.AuthorizedUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class UserController {
  @GetMapping("/user")
  public Map<String, Object> user(@AuthenticationPrincipal AuthorizedUser principal) {
    return Collections.singletonMap("user ID", principal.user().getId());
  }
}
