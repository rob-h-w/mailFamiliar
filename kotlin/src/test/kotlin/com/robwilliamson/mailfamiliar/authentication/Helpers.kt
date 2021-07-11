package com.robwilliamson.mailfamiliar.authentication

import com.robwilliamson.jooq.tables.records.UserRecord
import com.robwilliamson.mailfamiliar.user.UserService
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken
import org.springframework.security.oauth2.core.user.DefaultOAuth2User

object ValidUser {
    val id = "123"
    val name = "Rob"
    val url = "https://api.github.com/users"
}

fun validToken(userService: UserService): OAuth2AuthenticationToken {
    val userRecord = userService.upsertUser(ValidUser.name, ValidUser.id)
    return OAuth2AuthenticationToken(
        AuthorizedUser(
            DefaultOAuth2User(
                mutableListOf(),
                mutableMapOf(
                    "id" to ValidUser.id,
                    "name" to ValidUser.name,
                    "url" to ValidUser.url
                ) as Map<String, Any>?,
                "name"
            ),
            "name",
            userRecord
        ),
        mutableListOf(),
        "authorizedClientRegistrationId"
    )
}