package com.robwilliamson.mailfamiliar.user

import IntegrationTest
import com.robwilliamson.jooq.Tables.ENCRYPTED
import com.robwilliamson.jooq.Tables.USER
import com.robwilliamson.jooq.tables.records.UserRecord
import com.robwilliamson.mailfamiliar.crypto.Encrypted
import com.robwilliamson.mailfamiliar.crypto.asEncrypted
import org.assertj.core.api.Assertions.assertThat
import org.flywaydb.test.annotation.FlywayTest
import org.jooq.DSLContext
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired

@IntegrationTest
internal class UserServiceTest @Autowired constructor(
    private val dslContext: DSLContext,
    private val userService: UserService
) {
    val name = "name"
    val remoteId = "remote ID"

    @BeforeEach
    @FlywayTest
    fun setUp() {
    }

    @Nested
    inner class UpsertUser {
        lateinit var user: UserRecord

        @BeforeEach
        fun setUp() {
            user = userService.upsertUser(
                name = name,
                remoteId = remoteId
            )
        }

        @Test
        fun `creates a user`() {
            assertThat(user.name).isEqualTo(name)
            assertThat(user.remoteId).isEqualTo(remoteId)
            assertThat(user.secret).isNotZero
        }

        @Test
        fun `persists the user`() {
            val users = dslContext.selectFrom(USER).fetch()

            assertThat(users.size).isOne

            val userRecord = users.first()
            assertThat(userRecord).isEqualTo(user)
        }

        @Test
        fun `persists the user's secret`() {
            val secret = dslContext.selectFrom(ENCRYPTED)
                .where(ENCRYPTED.ID.eq(user.id))
                .fetchOptional()

            assertThat(secret).isNotEmpty
        }

        @Nested
        inner class AlreadyExisting {
            @BeforeEach
            fun setUp() {
                user = userService.upsertUser(
                    name = name,
                    remoteId = remoteId
                )
            }

            @Test
            fun `does not create new user or secret`() {
                assertThat(dslContext.fetchCount(USER)).isOne
                assertThat(dslContext.fetchCount(ENCRYPTED)).isOne
            }

            @Test
            fun `persists the user`() {
                val users = dslContext.selectFrom(USER).fetch()

                assertThat(users.size).isOne

                val userRecord = users.first()
                assertThat(userRecord).isEqualTo(user)
            }
        }

        @Nested
        inner class UpdatedName {
            val newName = "new name"

            @BeforeEach
            fun setUp() {
                user = userService.upsertUser(
                    name = newName,
                    remoteId = remoteId
                )
            }

            @Test
            fun `does not create new user or secret`() {
                assertThat(dslContext.fetchCount(USER)).isOne
                assertThat(dslContext.fetchCount(ENCRYPTED)).isOne
            }

            @Test
            fun `persists the user`() {
                val users = dslContext.selectFrom(USER).fetch()

                assertThat(users.size).isOne

                val userRecord = users.first()
                assertThat(userRecord).isEqualTo(user)
            }
        }
    }

    @Nested
    inner class keyFor {
        lateinit var key: Encrypted

        @BeforeEach
        fun setUp() {
            val user = userService.upsertUser(
                name = name,
                remoteId = remoteId
            )

            key = userService.keyFor(user)
        }

        @Test
        fun `gets the right key`() {
            val encrypted = dslContext.selectFrom(ENCRYPTED).fetchOne()!!.asEncrypted()
            assertThat(key).isEqualTo(encrypted)
        }
    }
}