package com.robwilliamson.mailfamiliar.config;

import com.zaxxer.hikari.HikariDataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;

import javax.sql.DataSource;

@Configuration
@RequiredArgsConstructor
public class Sqlite {
  private final Environment environment;

  @Bean
  public DataSource dataSource() {
    final HikariDataSource dataSource = new HikariDataSource();
    dataSource.setDriverClassName("org.sqlite.JDBC");

//    final DriverManagerDataSource dataSource = new DriverManagerDataSource();
//    dataSource.setDriverClassName("org.sqlite.JDBC");
//    dataSource.setUrl(environment.getProperty("url"));
    dataSource.setJdbcUrl(environment.getProperty("url"));
    dataSource.setUsername(environment.getProperty("user"));
    dataSource.setPassword(environment.getProperty("password"));
    dataSource.setMaximumPoolSize(1);
    return dataSource;
  }
}
