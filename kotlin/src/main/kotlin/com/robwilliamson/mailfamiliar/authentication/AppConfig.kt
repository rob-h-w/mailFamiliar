package com.robwilliamson.mailfamiliar.authentication

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter

@Configuration
class AppConfig @Autowired constructor(
    private val mfOAuth2UserService: MfOAuth2UserService
) : WebSecurityConfigurerAdapter() {
    override fun configure(http: HttpSecurity) {
        super.configure(http.oauth2Login { oauth2 ->
            oauth2.userInfoEndpoint { userInfo ->
                userInfo.userService {
                    mfOAuth2UserService.loadUser(it)
                }
            }
        })
    }
}