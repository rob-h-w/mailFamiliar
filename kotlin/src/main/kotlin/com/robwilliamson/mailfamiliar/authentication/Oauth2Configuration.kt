package com.robwilliamson.mailfamiliar.authentication

import com.robwilliamson.mailfamiliar.user.UserService
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService
import org.springframework.security.oauth2.core.user.OAuth2User
import org.springframework.transaction.annotation.Transactional

@Configuration
class Oauth2Configuration @Autowired constructor(
    private val userService: UserService
) {
    @Bean
    fun defaultOAuth2UserServiceFactory(): DefaultOAuth2UserServiceFactory {
        return DefaultOAuth2UserServiceFactory()
    }

    @Bean
    fun oauth2UserService(
        defaultOAuth2UserServiceFactory: DefaultOAuth2UserServiceFactory
    ): MfOAuth2UserService {
        return MfOAuth2UserService(
            defaultOAuth2UserServiceFactory.makeDefaultOAuth2UserService(),
            userService
        )
    }
}

open class MfOAuth2UserService(
    private val defaultOAuth2UserService: DefaultOAuth2UserService,
    private val userService: UserService
) : OAuth2UserService<OAuth2UserRequest, AuthorizedUser> {
    override fun loadUser(userRequest: OAuth2UserRequest): AuthorizedUser {
        val user = defaultOAuth2UserService.loadUser(userRequest)
        if (user.attributes.containsKey("url")) {
            val url = user.getAttribute<String>("url")
            if (url != null && url.toString().startsWith("https://api.github.com/users")) {
                return gitHubUser(user)
            }
        }

        throw UnsupportedAuthorizationServiceException()
    }

    @Transactional
    open fun gitHubUser(oAuth2User: OAuth2User): AuthorizedUser {
        val name = oAuth2User.getAttribute<String>("name")!!
        val remoteId = "github.com" + oAuth2User.getAttribute("id")
        val user = userService.upsertUser(name, remoteId)
        return AuthorizedUser(oAuth2User, "name", user)
    }
}

class DefaultOAuth2UserServiceFactory {
    fun makeDefaultOAuth2UserService(): DefaultOAuth2UserService {
        return DefaultOAuth2UserService()
    }
}
