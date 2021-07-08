package com.robwilliamson.mailfamiliar.crypto

data class Encrypted(
    val ciphertext: ByteArray,
    val nonce: ByteArray,
    val salt: ByteArray
)
