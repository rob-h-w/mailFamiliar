package com.robwilliamson.mailfamiliar.service.imap;

import lombok.RequiredArgsConstructor;
import org.springframework.data.util.Pair;

import java.util.*;
import java.util.stream.Stream;

@RequiredArgsConstructor
public class ImapHeaders {
  private final Map<String, List<String>> headers;

  public Stream<Pair<String, String>> stream() {
    return headers.entrySet()
        .stream()
        .flatMap(entry -> entry.getValue()
            .stream()
            .map(value -> Pair.of(entry.getKey(), value)));
  }
}
