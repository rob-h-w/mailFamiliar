package com.robwilliamson.mailfamiliar.controller;

import com.robwilliamson.mailfamiliar.authorization.AuthorizedUser;
import com.robwilliamson.mailfamiliar.service.ImapAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/")
@RequiredArgsConstructor
public class AccountController {
  private final ImapAccountService accountService;

  @GetMapping
  public String index(@AuthenticationPrincipal AuthorizedUser principal, Model model) {
    var imaps = accountService.getAccounts(principal);
    model.addAttribute("userName", principal.user().getName());
    model.addAttribute("imaps", imaps);
    return "index";
  }

  @GetMapping("/addImap")
  public String addImap(@AuthenticationPrincipal AuthorizedUser principal, Model model) {
    return "addImap";
  }
}
