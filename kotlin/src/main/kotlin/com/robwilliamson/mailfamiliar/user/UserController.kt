package com.robwilliamson.mailfamiliar.user

import com.robwilliamson.mailfamiliar.authentication.AuthorizedUser
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.core.user.OAuth2User
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import java.util.*

@Controller
@RequestMapping("/")
class UserController @Autowired constructor(
    private val userService: UserService
) {

    @GetMapping
    fun index(@AuthenticationPrincipal principal: AuthorizedUser, model: Model): String {
        val userRecord = principal.record
        val imaps = listOf<String>()
        model.addAttribute("userName", userRecord.name)
        model.addAttribute("imaps", imaps)
        return "index"
    }

    @GetMapping("/api/user")
    fun user(@AuthenticationPrincipal principal: AuthorizedUser): Map<String?, Any?> {
        return Collections.singletonMap("user ID", principal.record.id)
    }
}