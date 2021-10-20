package com.robwilliamson.mailfamiliar.authorization

import com.robwilliamson.jooq.Tables.IMAP
import com.robwilliamson.jooq.Tables.USER
import com.robwilliamson.mailfamiliar.authentication.AuthorizedUser
import com.robwilliamson.mailfamiliar.sqlite.userRecord
import org.jooq.DSLContext
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.access.AccessDeniedException
import org.springframework.stereotype.Service

@Service
class AuthorizationService @Autowired constructor(val dslContext: DSLContext) {
    fun assertImapAccountOwnership(principal: AuthorizedUser, imapAccountId: Int) {
        dslContext.select()
            .from(IMAP)
            .join(USER)
            .on(USER.REMOTE_ID.eq(principal.userRecord.remoteId))
            .where(IMAP.ID.eq(imapAccountId))
            .fetchOne()
            ?: throw AccessDeniedException("This user cannot access the IMAP account with ID " +
                    "$imapAccountId")

    }
}