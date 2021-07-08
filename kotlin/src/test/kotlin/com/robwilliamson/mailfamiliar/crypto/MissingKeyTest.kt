package com.robwilliamson.mailfamiliar.crypto

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest
class MissingKeyTest @Autowired constructor(
    private val encryptionService: EncryptionService
) {
    @Test
    fun `throws helpful exception`() {
        assertThrows<IllegalStateException> {
            encryptionService.encrypt(
                encryptionService.createEncryptedKey(),
                "plaintext".encodeToByteArray()
            )
        }
    }
}