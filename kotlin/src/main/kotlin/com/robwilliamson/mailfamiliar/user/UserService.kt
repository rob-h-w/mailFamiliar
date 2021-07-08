package com.robwilliamson.mailfamiliar.user

import com.robwilliamson.jooq.Tables.ENCRYPTED
import com.robwilliamson.jooq.Tables.USER
import com.robwilliamson.jooq.tables.records.UserRecord
import com.robwilliamson.mailfamiliar.crypto.Encrypted
import com.robwilliamson.mailfamiliar.crypto.EncryptionService
import com.robwilliamson.mailfamiliar.crypto.asEncrypted
import org.jooq.DSLContext
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class UserService @Autowired constructor(
    private val dslContext: DSLContext,
    private val encryptionService: EncryptionService
) {
    @Transactional
    fun upsertUser(name: String, remoteId: String): UserRecord {
        val alreadyExisting = dslContext.selectFrom(USER)
            .where(USER.REMOTE_ID.eq(remoteId))
            .fetch()

        if (alreadyExisting.isNotEmpty) {
            val userRecord = alreadyExisting.first()

            if (name != userRecord.name) {
                return dslContext.update(USER)
                    .set(mapOf(USER.NAME to name))
                    .where(USER.REMOTE_ID.eq(remoteId))
                    .returning()
                    .fetchOne()!!
            }

            return userRecord
        }

        val encryptedKey = encryptionService.createEncryptedKey()
        val encryptedKeyRecord = dslContext.insertInto(ENCRYPTED)
            .set(encryptedKey.asRecord())
            .returning()
            .fetchOne()!!

        return dslContext.insertInto(USER)
            .set(
                UserRecord()
                    .apply {
                        this.name = name
                        this.remoteId = remoteId
                        secret = encryptedKeyRecord.id
                    })
            .returning()
            .fetchOne()!!
    }

    fun keyFor(user: UserRecord): Encrypted {
        return dslContext.select(ENCRYPTED.asterisk())
            .from(ENCRYPTED)
            .join(USER)
            .on(USER.SECRET.eq(ENCRYPTED.ID))
            .where(USER.ID.eq(user.id))
            .fetchOne()!!
            .into(ENCRYPTED)
            .asEncrypted()
    }
}