package com.robwilliamson.mailfamiliar.test.endtoend

import com.robwilliamson.mailfamiliar.containers.GreenmailContainer
import org.junit.jupiter.api.assertTimeout
import org.junit.jupiter.api.assertTimeoutPreemptively
import org.testcontainers.junit.jupiter.Container
import java.lang.Thread.sleep
import java.time.Duration

open class EndToEndTest {
    companion object {

        @JvmStatic
        val SMTP = 3025

        @JvmStatic
        val POP3 = 3110

        @JvmStatic
        val IMAP = 3143

        @JvmStatic
        val SMTPS = 3465

        @JvmStatic
        val IMAPS = 3993

        @JvmStatic
        val POP3S = 3995

        @JvmStatic
        val API = 8080

        @Container
        @JvmStatic
        val greenmailContainer = GreenmailContainer()
            .withExposedPorts(
                SMTP,
                POP3,
                IMAP,
                SMTPS,
                IMAPS,
                POP3S,
                API
            )

        init {
            greenmailContainer.start()
        }
    }

    protected fun assertMailServer() {
        assertTimeoutPreemptively(Duration.ofSeconds(5)) {
            while (!(greenmailContainer.isRunning )) {
                sleep(100)
            }
        }
    }
}
