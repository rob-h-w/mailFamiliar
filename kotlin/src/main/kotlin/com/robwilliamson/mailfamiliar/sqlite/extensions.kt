package com.robwilliamson.mailfamiliar.sqlite

import com.robwilliamson.jooq.tables.records.MailboxRecord
import com.robwilliamson.jooq.tables.records.UserRecord
import com.robwilliamson.mailfamiliar.authentication.AuthorizedUser
import com.robwilliamson.mailfamiliar.imap.MailboxSummary

val AuthorizedUser.userRecord get(): UserRecord {
    return UserRecord().apply {
        name = this.name
        remoteId = this.remoteId
    }
}

fun MailboxRecord.summarize(): MailboxSummary {
    return MailboxSummary(id, name)
}