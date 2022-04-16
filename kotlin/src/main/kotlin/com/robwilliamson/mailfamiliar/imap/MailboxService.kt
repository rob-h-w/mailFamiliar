package com.robwilliamson.mailfamiliar.imap

import com.robwilliamson.jooq.Tables.MAILBOX
import com.robwilliamson.jooq.tables.records.MailboxRecord
import org.jooq.DSLContext
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service

@Service
class MailboxService @Autowired constructor(val dslContext: DSLContext) {
    fun mailboxenFor(imapAccountId: Int): List<MailboxRecord> {
        return dslContext.selectFrom(MAILBOX)
            .where(MAILBOX.IMAP_ACCOUNT_ID.eq(imapAccountId))
            .fetch()
    }
}