package com.robwilliamson.mailfamiliar.index

import com.robwilliamson.mailfamiliar.authentication.AuthorizedUser
import com.robwilliamson.mailfamiliar.user.UserService
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping

@Controller
@RequestMapping("/")
class IndexController @Autowired constructor(
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
}