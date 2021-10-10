package com.robwilliamson.mailfamiliar.test.endtoend

import IntegrationTest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@IntegrationTest
class MailboxEnumerationTest : EndToEndTest() {

    @BeforeEach
    fun setUp() {
        assertMailServer()
    }

    @Test
    fun `does the things`() {
        assertThat(greenmailContainer.isRunning).isTrue
    }
}