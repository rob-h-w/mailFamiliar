package com.robwilliamson.mailfamiliar.user

import com.robwilliamson.mailfamiliar.authentication.AuthorizedUser
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.core.user.OAuth2User
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.*

@RestController
@RequestMapping("/api/user")
class UserController @Autowired constructor(
    private val userService: UserService
) {

    @GetMapping
    fun user(@AuthenticationPrincipal principal: AuthorizedUser): Map<String?, Any?> {
        return Collections.singletonMap("user_id", principal.record.id)
    }
}