package com.robwilliamson.mailfamiliar.imap

import com.robwilliamson.mailfamiliar.authentication.AuthorizedUser
import com.robwilliamson.mailfamiliar.authorization.AuthorizationService
import com.robwilliamson.mailfamiliar.sqlite.summarize
import com.robwilliamson.mailfamiliar.sqlite.userRecord
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam

@Controller
@RequestMapping("/")
class ImapController @Autowired constructor(
    val authorizationService: AuthorizationService,
    val mailboxService: MailboxService
) {

    @GetMapping("/create-imap")
    fun createImap(@AuthenticationPrincipal principal: AuthorizedUser, model: Model): String {
        model.addAttribute("imapModel", ImapAccountCreationDto(principal.userRecord))
        return "create-imap"
    }

    @GetMapping("/read-imap")
    fun readImap(
        @AuthenticationPrincipal principal: AuthorizedUser,
        @RequestParam id: Int,
        model: Model
    ): String {
        authorizationService.assertImapAccountOwnership(principal, id)
        model.addAttribute("boxen", mailboxService.mailboxenFor(id)
            .map { mailbox -> mailbox.summarize() })
        return "read-imap"
    }
}