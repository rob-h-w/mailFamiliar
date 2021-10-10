package com.robwilliamson.mailfamiliar.containers

import org.testcontainers.containers.GenericContainer

class GreenmailContainer : GenericContainer<GreenmailContainer>("greenmail/standalone:latest")
