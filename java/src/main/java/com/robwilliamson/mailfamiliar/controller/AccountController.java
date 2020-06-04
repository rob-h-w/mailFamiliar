package com.robwilliamson.mailfamiliar.controller;

import com.robwilliamson.mailfamiliar.authorization.AuthorizedUser;
import com.robwilliamson.mailfamiliar.model.*;
import com.robwilliamson.mailfamiliar.service.ImapAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import javax.validation.Valid;

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

  @GetMapping("/create-imap")
  public String createImap(@AuthenticationPrincipal AuthorizedUser principal, Model model) {
    final Imap imapModel = new Imap();
    imapModel.setUser(User.from(principal.user()));
    imapModel.setPort(993);
    imapModel.setTls(true);
    imapModel.setMoveThreshold(0.25f);
    imapModel.setRefreshPeriodMinutes(30);
    imapModel.setSyncPeriodDays(90);
    model.addAttribute("imapModel", imapModel);
    return "create-imap";
  }

  @GetMapping("/delete-imap")
  public ModelAndView deleteImap(
      @AuthenticationPrincipal AuthorizedUser principal,
      @RequestParam String name,
      @RequestParam String host,
      ModelMap modelMap) {
    accountService.deleteAccount(principal.user(), name, host);
    return new ModelAndView("redirect:/", modelMap);
  }

  @PostMapping("/imap")
  public ModelAndView saveImap(
      @AuthenticationPrincipal AuthorizedUser principal,
      @ModelAttribute @Valid Imap imapModel, ModelMap modelMap) {
    imapModel.setUser(User.from(principal.user()));
    accountService.saveAccount(principal, imapModel);
    return new ModelAndView("redirect:/", modelMap);
  }
}
