package com.robwilliamson.mailfamiliar.config;

import com.zaxxer.hikari.HikariDataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;

import javax.sql.DataSource;

@Configuration
@RequiredArgsConstructor
public class Sqlite {
  @Value("${spring.datasource.hikari.connection-timeout:1000}")
  private long connectionTimeout;
  @Value("${spring.datasource.hikari.idle-timeout:500}")
  private long idleTimeout;
  @Value("${password}")
  private String password;
  @Value("${url}")
  private String url;
  @Value("${username}")
  private String userName;

  @Bean
  public DataSource dataSource() {
    final HikariDataSource dataSource = new HikariDataSource();
    dataSource.setConnectionTimeout(connectionTimeout);
    dataSource.setDriverClassName("org.sqlite.JDBC");
    dataSource.setIdleTimeout(idleTimeout);
    dataSource.setJdbcUrl(url);
    dataSource.setMaximumPoolSize(1);
    dataSource.setPassword(password);
    dataSource.setUsername(userName);
    return dataSource;
  }
}
