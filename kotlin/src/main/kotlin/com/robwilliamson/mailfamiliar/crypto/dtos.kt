package com.robwilliamson.mailfamiliar.crypto

import com.robwilliamson.jooq.tables.records.EncryptedRecord
import com.robwilliamson.mailfamiliar.contentNotEquals

data class Encrypted(
    val ciphertext: ByteArray,
    val nonce: ByteArray,
    val salt: ByteArray
) {
    fun asRecord(): EncryptedRecord {
        this.ciphertext
        return EncryptedRecord()
            .apply {
                ciphertext = this@Encrypted.ciphertext
                nonce = this@Encrypted.nonce
                salt = this@Encrypted.salt
            }
    }

    override fun equals(other: Any?): Boolean {
        return when {
            !(other is Encrypted) ||
                    other.ciphertext.contentNotEquals(ciphertext) ||
                    other.nonce.contentNotEquals(nonce) ||
                    other.salt.contentNotEquals(salt) -> false
            else -> true
        }
    }
}

fun EncryptedRecord.asEncrypted(): Encrypted {
    return Encrypted(
        ciphertext = this.ciphertext,
        nonce = this.nonce,
        salt = this.salt
    )
}
