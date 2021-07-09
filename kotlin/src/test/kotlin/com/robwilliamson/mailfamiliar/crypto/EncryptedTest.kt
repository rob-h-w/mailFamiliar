package com.robwilliamson.mailfamiliar.crypto

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test

internal class EncryptedTest {
    @Nested
    inner class Equals {
        val ciphertext = byteArrayOf(-1)
        val nonce = byteArrayOf(1)
        val salt = byteArrayOf(0)
        val encrypted = Encrypted(
            ciphertext,
            nonce,
            salt
        )

        @Test
        fun `true when equal`() {
            assertThat(encrypted).isEqualTo(encrypted)
        }

        @Test
        fun `false when type is wrong`() {
            assertThat(encrypted).isNotEqualTo(10)
        }

        @Test
        fun `false when ciphertext is wrong`() {
            assertThat(encrypted).isNotEqualTo(
                Encrypted(
                    byteArrayOf(),
                    nonce,
                    salt
                )
            )
        }

        @Test
        fun `false when nonce is wrong`() {
            assertThat(encrypted).isNotEqualTo(
                Encrypted(
                    ciphertext,
                    byteArrayOf(),
                    salt
                )
            )
        }

        @Test
        fun `false when salt is wrong`() {
            assertThat(encrypted).isNotEqualTo(
                Encrypted(
                    ciphertext,
                    nonce,
                    byteArrayOf()
                )
            )
        }
    }
}