package com.robwilliamson.mailfamiliar.crypto

import com.nimbusds.jose.util.Base64
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.core.env.AbstractEnvironment
import org.springframework.stereotype.Service
import java.security.spec.KeySpec
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec
import kotlin.random.Random

@Service
class EncryptionService @Autowired constructor(
    private val environment: AbstractEnvironment
) {
    companion object {
        const val AES_KEY_SIZE = 128
        const val GCM_NONCE_LENGTH = 12
        const val GCM_TAG_LENGTH = 16
        const val ITERATION_COUNT = Short.MAX_VALUE * 2
        const val PEPPER = "4w9508yhwknwj54hg. w54kg9ae az.ku 54etihu45t4i3t34uhlizsd.'rsa][8t976tf"
            .plus("'[09}POI`frm.SEn<")
        const val SALT_LENGTH = 10
    }

    private val keyFactory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
    private var masterSecretValue: SecretKey? = null

    fun createEncryptedKey(): Encrypted {
        return encrypt(masterSecret, makeSalt(), makeCryptoKey())
    }

    fun decrypt(secretKey: SecretKey, encrypted: Encrypted): ByteArray {
        val cipher = createCipher()
        cipher.init(
            Cipher.DECRYPT_MODE,
            secretKey,
            specFor(encrypted.nonce)
        )
        return cipher.doFinal(encrypted.ciphertext)
    }

    fun decrypt(secretKey: Encrypted, cyphertext: Encrypted): ByteArray {
        return decrypt(decryptKey(secretKey), cyphertext)
    }

    fun decrypt(key: CharArray, encrypted: Encrypted): ByteArray {
        return decrypt(generateSecret(key, encrypted.salt), encrypted)
    }

    fun encrypt(secretKey: Encrypted, plaintext: ByteArray): Encrypted {
        val salt = makeSalt()
        return encrypt(generateSecret(decryptKey(secretKey), salt), salt, plaintext)
    }

    fun encrypt(secretKey: SecretKey, salt: ByteArray, plaintext: ByteArray): Encrypted {
        val nonce: ByteArray = Random.nextBytes(GCM_NONCE_LENGTH)
        val cipher = createCipher()
        cipher.init(
            Cipher.ENCRYPT_MODE,
            secretKey,
            specFor(nonce)
        )
        val ciphertext = cipher.doFinal(plaintext)
        return Encrypted(
            ciphertext = ciphertext,
            nonce = nonce,
            salt = salt
        )
    }

    private fun createCipher(): Cipher {
        return Cipher.getInstance("AES/GCM/NoPadding", "SunJCE")
    }

    private fun decryptKey(encryptedKey: Encrypted): CharArray {
        return Base64.encode(decrypt(masterSecret, encryptedKey)).toString().toCharArray()
    }

    private fun keySpecFor(key: CharArray, salt: ByteArray): KeySpec {
        return PBEKeySpec(
            key,
            salt,
            ITERATION_COUNT,
            AES_KEY_SIZE
        )
    }

    private fun makeCryptoKey(): ByteArray {
        return Random.nextBytes(AES_KEY_SIZE)
    }

    private fun makeSalt(): ByteArray {
        return Random.nextBytes(SALT_LENGTH)
    }

    private val masterKey
        get(): String {
            return environment.getProperty("MAIL_FAMILIAR_KEY")
                ?: error("MAIL_FAMILIAR_KEY must be provided")
        }

    private val masterSecret
        get(): SecretKey {
            return if (masterSecretValue == null) {
                masterSecretValue = generateSecret(
                    masterKey.toCharArray(),
                    PEPPER.toByteArray()
                )
                masterSecretValue!!
            } else {
                masterSecretValue!!
            }
        }

    private fun generateSecret(key: CharArray, salt: ByteArray): SecretKey {
        return SecretKeySpec(
            keyFactory
                .generateSecret(
                    keySpecFor(
                        key,
                        salt
                    )
                )
                .encoded,
            "AES"
        )
    }

    private fun specFor(nonce: ByteArray): GCMParameterSpec {
        return GCMParameterSpec(
            GCM_TAG_LENGTH * 8,
            nonce
        )
    }
}