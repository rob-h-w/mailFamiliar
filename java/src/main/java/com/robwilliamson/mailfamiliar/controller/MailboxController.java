package com.robwilliamson.mailfamiliar.controller;

import com.robwilliamson.mailfamiliar.authorization.AuthorizedUser;
import com.robwilliamson.mailfamiliar.service.ImapSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.stream.Collectors;

@Controller
@RequestMapping("/")
@RequiredArgsConstructor
public class MailboxController {
  private final ImapSyncService imapSyncService;

  @GetMapping("/read-imap")
  public String readImap(
      @AuthenticationPrincipal AuthorizedUser principal,
      @RequestParam int id,
      Model model) {
    model.addAttribute("boxen", imapSyncService.mailboxenFor(id).collect(Collectors.toList()));
    return "read-imap";
  }
}
