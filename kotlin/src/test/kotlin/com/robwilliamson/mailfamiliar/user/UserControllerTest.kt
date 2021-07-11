package com.robwilliamson.mailfamiliar.user

import com.robwilliamson.mailfamiliar.RestTestBaseconstructor
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

internal class UserControllerTest @Autowired constructor(
    private val mockMvc: MockMvc,
    userService: UserService
) : RestTestBaseconstructor(userService) {

    @Test
    fun `disallows unauthenticated`() {
        mockMvc.perform(get("/api/user"))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `returns the user`() {
        mockMvc.perform(
            get("/api/user")
                .with(validAuthentication)
        )
            .andExpect(status().isOk)
            .andExpect(
                content().json(
                    """
                {
                    "user_id": 1
                }
            """.trimIndent()
                )
            )
    }
}