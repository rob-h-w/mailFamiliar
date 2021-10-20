package com.robwilliamson.mailfamiliar.imap

import com.robwilliamson.jooq.tables.records.MailboxRecord
import com.robwilliamson.jooq.tables.records.UserRecord
import java.io.Serializable

data class ImapAccountCreationDto(
    val id: Int?,
    val host: String?,
    val moveThreshold: Float?,
    val name: String?,
    val password: String?,
    val port: Int?,
    val refreshPeriodMinutes: Int?,
    val syncPeriodDays: Int?,
    val tls: Boolean?,
    val user: UserRecord
) : Serializable {
    constructor(userRecord: UserRecord) : this(
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        userRecord
    )
}

data class MailboxSummary(
    val id: Int,
    val name: String
)
