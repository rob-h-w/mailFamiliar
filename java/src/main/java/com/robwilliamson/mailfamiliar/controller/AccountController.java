package com.robwilliamson.mailfamiliar.controller;

import com.robwilliamson.mailfamiliar.authorization.AuthorizedUser;
import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.exceptions.*;
import com.robwilliamson.mailfamiliar.model.*;
import com.robwilliamson.mailfamiliar.service.ImapAccountService;
import com.robwilliamson.mailfamiliar.service.imap.UserAccountIdentifier;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import javax.validation.Valid;
import java.util.Collection;
import java.util.stream.Collectors;

import static com.robwilliamson.mailfamiliar.CopyProperties.copy;

@Controller
@RequestMapping("/")
@RequiredArgsConstructor
public class AccountController {
  private final ImapAccountService accountService;
  private final UserAccountIdentifier userAccountIdentifier;

  private static Collection<ImapAccountDto> toDto(User user, Collection<Imap> imaps) {
    final var userDto = UserDto.from(user);
    return imaps
        .stream()
        .map(imap -> ImapAccountDto.from(userDto, imap))
        .collect(Collectors.toList());
  }

  @GetMapping
  public String index(@AuthenticationPrincipal AuthorizedUser principal, Model model) {
    final var user = principal.user();
    final var imaps = toDto(user, accountService.getAccountsFor(user));
    model.addAttribute("userName", user.getName());
    model.addAttribute("imaps", imaps);
    return "index";
  }

  @GetMapping("/create-imap")
  public String createImap(@AuthenticationPrincipal AuthorizedUser principal, Model model) {
    model.addAttribute("imapModel", ImapAccountDto.withDefaults(UserDto.from(principal.user())));
    return "create-imap";
  }

  @GetMapping("/delete-imap")
  public ModelAndView deleteImap(
      @AuthenticationPrincipal AuthorizedUser principal,
      @RequestParam int id,
      ModelMap modelMap) {
    userAccountIdentifier.assertOwnership(principal, Id.of(id, Imap.class));
    accountService.deleteAccount(id);
    return new ModelAndView("redirect:/", modelMap);
  }

  @PostMapping("/imap")
  public ModelAndView saveImap(
      @AuthenticationPrincipal AuthorizedUser principal,
      @ModelAttribute @Valid ImapAccountDto imapAccount,
      ModelMap modelMap) throws MissingUserException, MissingSecretException {
    final var user = principal.user();
    imapAccount.setUserDto(UserDto.from(user));
    accountService.saveAccount(user, copy(imapAccount, new Imap()), imapAccount.getPassword());
    return new ModelAndView("redirect:/", modelMap);
  }
}
