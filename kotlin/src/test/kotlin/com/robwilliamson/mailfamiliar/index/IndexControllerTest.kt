package com.robwilliamson.mailfamiliar.index

import com.robwilliamson.mailfamiliar.RestTestBaseconstructor
import com.robwilliamson.mailfamiliar.user.UserService
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.model
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

internal class IndexControllerTest @Autowired constructor(
    private val mockMvc: MockMvc,
    userService: UserService
) : RestTestBaseconstructor(userService) {

    @Test
    fun `disallows unauthenticated`() {
        mockMvc.perform(MockMvcRequestBuilders.get("/"))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `renders a page`() {
        mockMvc.perform(
            MockMvcRequestBuilders.get("/")
                .with(validAuthentication)
        )
            .andExpect(status().isOk)
            .andExpect(model().attribute("userName", "Rob"))
            .andExpect(model().attribute("imaps", listOf<String>()))
    }
}