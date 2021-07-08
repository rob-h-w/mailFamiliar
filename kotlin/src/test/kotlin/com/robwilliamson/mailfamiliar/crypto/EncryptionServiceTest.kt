package com.robwilliamson.mailfamiliar.crypto

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.TestPropertySource

@SpringBootTest
@TestPropertySource(
    properties = arrayOf(
        "MAIL_FAMILIAR_KEY=testkey"
    )
)
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