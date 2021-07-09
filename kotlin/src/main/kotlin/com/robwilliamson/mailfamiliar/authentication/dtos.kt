package com.robwilliamson.mailfamiliar.authentication

import com.robwilliamson.jooq.tables.records.UserRecord
import org.springframework.security.oauth2.core.user.DefaultOAuth2User
import org.springframework.security.oauth2.core.user.OAuth2User

class AuthorizedUser(
    oAuth2User: OAuth2User,
    nameAttributeKey: String,
    val record: UserRecord
) : DefaultOAuth2User(oAuth2User.authorities, oAuth2User.attributes, nameAttributeKey)