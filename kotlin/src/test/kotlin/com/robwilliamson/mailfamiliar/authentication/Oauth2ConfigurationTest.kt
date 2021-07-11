package com.robwilliamson.mailfamiliar.authentication

import IntegrationTest
import com.robwilliamson.mailfamiliar.user.UserService
import org.assertj.core.api.Assertions.assertThat
import org.flywaydb.test.annotation.FlywayTest
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.Mock
import org.mockito.Mockito.*
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.security.oauth2.client.registration.ClientRegistration
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest
import org.springframework.security.oauth2.core.AuthorizationGrantType
import org.springframework.security.oauth2.core.OAuth2AccessToken
import org.springframework.security.oauth2.core.user.OAuth2User

@ExtendWith(MockitoExtension::class)
@Import(Oauth2ConfigurationTest.Config::class)
@IntegrationTest
internal class Oauth2ConfigurationTest {

    @Mock
    lateinit var oAuth2User: OAuth2User

    @Mock
    lateinit var defaultOAuth2UserService: DefaultOAuth2UserService

    @Autowired
    lateinit var defaultOAuth2UserServiceFactory: DefaultOAuth2UserServiceFactory

    @Autowired
    lateinit var oAuth2UserOAuth2UserService: MfOAuth2UserService

    lateinit var oAuth2UserRequest: OAuth2UserRequest

    @TestConfiguration
    class Config @Autowired constructor(
        private val userService: UserService
    ) {
        @Bean
        fun defaultOAuth2UserServiceFactory(): DefaultOAuth2UserServiceFactory {
            return mock(DefaultOAuth2UserServiceFactory::class.java)
        }

        @Bean
        fun oauth2UserService(
            defaultOAuth2UserServiceFactory: DefaultOAuth2UserServiceFactory
        ): MfOAuth2UserService {
            return MfOAuth2UserService(defaultOAuth2UserServiceFactory, userService)
        }
    }

    @BeforeEach
    @FlywayTest
    fun setUp() {
        doReturn(defaultOAuth2UserService)
            .`when`(defaultOAuth2UserServiceFactory)
            .makeDefaultOAuth2UserService()
        val clientRegistration = ClientRegistration.withRegistrationId("123")
            .authorizationGrantType(AuthorizationGrantType.JWT_BEARER)
            .build()
        oAuth2UserRequest = OAuth2UserRequest(
            clientRegistration,
            mock(OAuth2AccessToken::class.java)
        )
    }

    @Nested
    inner class SupportedUser {
        val id = "ID"
        val name = "Hootus McMacIntyressonsen"
        val url = "https://api.github.com/users"

        @BeforeEach
        fun setUp() {
            doReturn(
                mapOf(
                    "id" to id,
                    "name" to name,
                    "url" to url
                )
            )
                .`when`(oAuth2User)
                .attributes
            doReturn(id)
                .`when`(oAuth2User)
                .getAttribute<String>("id")
            doReturn(name)
                .`when`(oAuth2User)
                .getAttribute<String>("name")
            doReturn(url)
                .`when`(oAuth2User)
                .getAttribute<String>("url")
            doReturn(oAuth2User)
                .`when`(defaultOAuth2UserService)
                .loadUser(eq(oAuth2UserRequest))
        }

        @Test
        fun `loads the user properly`() {
            val user = oAuth2UserOAuth2UserService.loadUser(oAuth2UserRequest)

            assertThat(user.record.name).isEqualTo(name)
        }
    }

    @Nested
    inner class MissingUrl {
        @BeforeEach
        fun setUp() {
            doReturn(mapOf<String, Any>())
                .`when`(oAuth2User)
                .attributes
            doReturn(oAuth2User)
                .`when`(defaultOAuth2UserService)
                .loadUser(eq(oAuth2UserRequest))
        }

        @Test
        fun `throws`() {
            assertThrows<UnsupportedAuthorizationServiceException> {
                oAuth2UserOAuth2UserService.loadUser(oAuth2UserRequest)
            }
        }
    }

    @Nested
    inner class UnsupportedAuthType {
        @BeforeEach
        fun setUp() {
            doReturn(mapOf(
                "url" to "https://farcebook.comb/users"
            ))
                .`when`(oAuth2User)
                .attributes
            doReturn(oAuth2User)
                .`when`(defaultOAuth2UserService)
                .loadUser(eq(oAuth2UserRequest))
        }

        @Test
        fun `throws`() {
            assertThrows<UnsupportedAuthorizationServiceException> {
                oAuth2UserOAuth2UserService.loadUser(oAuth2UserRequest)
            }
        }
    }
}