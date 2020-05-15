package com.robwilliamson.mailfamiliar.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;

@Configuration
@RequiredArgsConstructor
public class SqliteConfig {
  private final Environment environment;

  @Bean
  public DataSource dataSource() {
    final DriverManagerDataSource dataSource = new DriverManagerDataSource();
    dataSource.setDriverClassName("org.sqlite.JDBC");
    dataSource.setUrl(environment.getProperty("url"));
    dataSource.setUsername(environment.getProperty("user"));
    dataSource.setPassword(environment.getProperty("password"));
    return dataSource;
  }
}
