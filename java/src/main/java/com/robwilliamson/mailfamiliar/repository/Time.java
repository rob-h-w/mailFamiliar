package com.robwilliamson.mailfamiliar.repository;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.Date;

public class Time {
  private static final ZoneId UTC = ZoneId.of("UTC");

  private Time() {
  }

  public static String from(LocalDateTime localDateTime) {
    return localDateTime
        .format(DateTimeFormatter.ISO_DATE_TIME)
        .toUpperCase()
        .replace('T', ' ');
  }

  public static String from(Date date) {
    return from(LocalDateTime.ofInstant(date.toInstant(), UTC));
  }

  public static Date parseDate(String string) {
    return Date.from(parseLocalDateTime(string).atZone(UTC).toInstant());
  }

  public static LocalDateTime parseLocalDateTime(String string) {
    return LocalDateTime.parse(string
        .replace(' ', 'T'));
  }
}
