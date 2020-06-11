package com.robwilliamson.mailfamiliar.controller;

import com.robwilliamson.mailfamiliar.authorization.AuthorizedUser;
import com.robwilliamson.mailfamiliar.entity.Imap;
import com.robwilliamson.mailfamiliar.model.*;
import com.robwilliamson.mailfamiliar.service.ImapSyncService;
import com.robwilliamson.mailfamiliar.service.imap.UserAccountIdentifier;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.stream.Collectors;

import static com.robwilliamson.mailfamiliar.CopyProperties.copy;

@Controller
@RequestMapping("/")
@RequiredArgsConstructor
public class MailboxController {
  private final ImapSyncService imapSyncService;
  private final UserAccountIdentifier userAccountIdentifier;

  @GetMapping("/read-imap")
  public String readImap(
      @AuthenticationPrincipal AuthorizedUser principal,
      @RequestParam int id,
      Model model) {
    userAccountIdentifier.assertOwnership(principal, Id.of(id, Imap.class));
    model.addAttribute("boxen", imapSyncService.mailboxenFor(id)
        .map(mailbox -> copy(mailbox, new MailboxDto()))
        .collect(Collectors.toList()));
    return "read-imap";
  }
}
