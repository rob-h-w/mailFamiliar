package com.robwilliamson.mailfamiliar.controller;

import com.robwilliamson.mailfamiliar.authorization.AuthorizedUser;
import com.robwilliamson.mailfamiliar.model.*;
import com.robwilliamson.mailfamiliar.service.ImapAccountService;
import com.robwilliamson.mailfamiliar.service.imap.UserAccountIdentifier;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import javax.validation.Valid;
import java.util.Optional;

@Controller
@RequestMapping("/")
@RequiredArgsConstructor
public class AccountController {
  private final ImapAccountService accountService;
  private final UserAccountIdentifier userAccountIdentifier;

  @GetMapping
  public String index(@AuthenticationPrincipal AuthorizedUser principal, Model model) {
    final var user = principal.user();
    final var imaps = accountService.getAccountsFor(user);
    model.addAttribute("userName", user.getName());
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
      @RequestParam int id,
      ModelMap modelMap) {
    assertOwnership(principal, id);
    accountService.deleteAccount(id);
    return new ModelAndView("redirect:/", modelMap);
  }

  @PostMapping("/imap")
  public ModelAndView saveImap(
      @AuthenticationPrincipal AuthorizedUser principal,
      @ModelAttribute @Valid Imap imapModel, ModelMap modelMap) {
    final var user = principal.user();
    imapModel.setUser(User.from(user));
    accountService.saveAccount(user, imapModel);
    return new ModelAndView("redirect:/", modelMap);
  }

  private void assertOwnership(AuthorizedUser principal, int imapAccountId) {
    Optional<Id<User>> userIdOptional = userAccountIdentifier
        .ownerOf(Id.of(imapAccountId, Imap.class));
    if (userIdOptional.isEmpty() || userIdOptional.get().getValue() != principal.user().getId()) {
      throw new AccessDeniedException("This user cannot access the IMAP account with ID "
          + imapAccountId);
    }
  }
}
