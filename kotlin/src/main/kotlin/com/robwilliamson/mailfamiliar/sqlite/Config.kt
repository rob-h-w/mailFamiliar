package com.robwilliamson.mailfamiliar.config

import com.zaxxer.hikari.HikariDataSource
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import javax.sql.DataSource

@Configuration
class Sqlite constructor(
    @Value("\${spring.datasource.hikari.connection-timeout:1000}")
    private val connectionTimeout: Long,

    @Value("\${spring.datasource.hikari.idle-timeout:500}")
    private val idleTimeout: Long,

    @Value("\${mail-familiar.persistence.password}")
    private val password: String,

    @Value("\${mail-familiar.persistence.url}")
    private val url: String,

    @Value("\${mail-familiar.persistence.username}")
    private val userName: String
) {
    @Bean
    fun dataSource(): DataSource {
        val dataSource = HikariDataSource()
        dataSource.connectionTimeout = connectionTimeout
        dataSource.driverClassName = "org.sqlite.JDBC"
        dataSource.idleTimeout = idleTimeout
        dataSource.jdbcUrl = url
        dataSource.maximumPoolSize = 1
        dataSource.password = password
        dataSource.username = userName
        return dataSource
    }
}