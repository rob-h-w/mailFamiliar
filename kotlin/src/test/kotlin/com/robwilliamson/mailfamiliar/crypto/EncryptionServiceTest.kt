package com.robwilliamson.mailfamiliar.crypto

import IntegrationTest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired

@IntegrationTest
internal class EncryptionServiceTest @Autowired constructor(
    private val encryptionService: EncryptionService
) {
    companion object {
        const val PLAINTEXT = "plaintext"
    }

    @Nested
    inner class Encrypt {
        @Test
        fun `works`() {
            val encryptedKey = encryptionService.createEncryptedKey()
            val ciphertext = encryptionService.encrypt(encryptedKey, PLAINTEXT.encodeToByteArray())
            assertThat(ciphertext).isNotNull
            assertThat(encryptionService.decrypt(encryptedKey, ciphertext))
                .isEqualTo(PLAINTEXT.encodeToByteArray())
        }
    }
}