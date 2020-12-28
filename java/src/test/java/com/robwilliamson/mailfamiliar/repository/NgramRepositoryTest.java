package com.robwilliamson.mailfamiliar.repository;

import com.robwilliamson.mailfamiliar.entity.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
public class NgramRepositoryTest {
  @Autowired
  Flyway flyway;
  @Autowired
  NgramRepository ngramRepository;

  @BeforeEach
  void setUp() {
    flyway.migrate();
  }

  @AfterEach
  void tearDown() {
    flyway.clean();
  }

  NgramValue makeValue(int id) {
    return new NgramValue("value " + id);
  }

  NgramCount makeCount(int id, Ngram parent) {
    final NgramCount count = new NgramCount();
    count.setCount(id);
    count.setNgram(parent);
    count.setValue(makeValue(id));
    return count;
  }

  @Nested
  class Crud {
    private static final String NAME = "name";
    List<NgramCount> counts;
    Ngram ngram;

    @BeforeEach
    void setUp() {
      ngram = new Ngram();
      counts = List.of(makeCount(1, ngram));
      ngram.setCounts(counts);
      ngram.setName(NAME);
      ngram = ngramRepository.save(ngram);
    }

    @Test
    void read() {
      final Optional<Ngram> optionalNgram = ngramRepository.findDistinctByName(NAME);
      assertThat(optionalNgram.isPresent()).isTrue();
      final Ngram actual = optionalNgram.get();
      assertThat(actual.getCounts().size()).isEqualTo(counts.size());
    }
  }
}
