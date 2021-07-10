package com.robwilliamson.mailfamiliar.imap

import com.robwilliamson.mailfamiliar.authentication.AuthorizedUser
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam

@Controller
@RequestMapping("/")
class ImapController {

    @GetMapping("/create-imap")
    fun createImap(@AuthenticationPrincipal principal: AuthorizedUser, model: Model): String {
//        model.addAttribute("imapModel", ImapAccountDto.withDefaults(UserDto.from(principal.user())))
        return "create-imap"
    }

    @GetMapping("/read-imap")
    fun readImap(
        @AuthenticationPrincipal principal: AuthorizedUser,
        @RequestParam id: Int,
        model: Model
    ): String {
//        userAccountIdentifier.assertOwnership(principal, Id.of(id, Imap::class.java))
//        model.addAttribute("boxen", imapSyncService.mailboxenFor(id)
//            .map { mailbox -> copy(mailbox, MailboxDto()) }
//            .collect(Collectors.toList()))
        return "read-imap"
    }
}