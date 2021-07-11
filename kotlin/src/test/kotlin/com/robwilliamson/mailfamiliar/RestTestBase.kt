package com.robwilliamson.mailfamiliar

import IntegrationTest
import com.robwilliamson.mailfamiliar.authentication.validToken
import com.robwilliamson.mailfamiliar.user.UserService
import org.flywaydb.test.annotation.FlywayTest
import org.junit.jupiter.api.BeforeEach
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication
import org.springframework.test.web.servlet.request.RequestPostProcessor

@AutoConfigureMockMvc
@IntegrationTest
class RestTestBaseconstructor(
    private val userService: UserService
) {
    lateinit var validToken: OAuth2AuthenticationToken

    @BeforeEach
    @FlywayTest
    fun setUp() {
        validToken = validToken(userService)
    }

    protected val validAuthentication
        get(): RequestPostProcessor {
            return authentication(validToken)
        }
}