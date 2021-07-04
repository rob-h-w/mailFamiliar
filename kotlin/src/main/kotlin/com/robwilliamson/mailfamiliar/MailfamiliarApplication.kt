package com.robwilliamson.mailfamiliar

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class MailfamiliarApplication

fun main(args: Array<String>) {
    runApplication<MailfamiliarApplication>(*args)
}
