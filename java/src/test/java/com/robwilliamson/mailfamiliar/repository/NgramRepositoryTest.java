package com.robwilliamson.mailfamiliar.repository;

import com.robwilliamson.mailfamiliar.entity.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.*;
import java.util.stream.*;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
public class NgramRepositoryTest {
  public static final int MAX = 100;
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

  List<NgramCount> makeCounts(int total, Ngram parent) {
    return IntStream.range(0, total)
        .mapToObj(id -> makeCount(id, parent))
        .collect(Collectors.toList());
  }

  NgramCount makeCount(int id, Ngram parent) {
    final NgramCount count = new NgramCount();
    count.setCount(makeCount(id));
    count.setNgram(parent);
    count.setValue(makeValue(id));
    return count;
  }

  NgramValue makeValue(int id) {
    return new NgramValue("value " + id);
  }

  int makeCount(int id) {
    int result = id ^ 31;
    result <<= 17;
    result ^= 31;
    result += id;
    return result % (MAX + 1);
  }

  @Nested
  class Crud {
    private static final String NAME = "name";
    List<NgramCount> counts;
    Ngram ngram;

    @BeforeEach
    void setUp() {
      ngram = new Ngram();
      counts = makeCounts(10, ngram);
      ngram.setCounts(counts);
      ngram.setName(NAME);
      ngram = ngramRepository.save(ngram);
    }

    @Test
    void read() {
      final Optional<Ngram> optionalNgram = ngramRepository.findDistinctByName(NAME);
      assertThat(optionalNgram.isPresent()).isTrue();
      final Ngram actual = optionalNgram.get();
      final List<NgramCount> actualCounts = actual.getCounts();
      assertThat(actualCounts.size()).isEqualTo(counts.size());
      IntStream.range(0, actualCounts.size())
          .forEach(i -> assertThat(actualCounts.get(i)).isEqualToComparingFieldByFieldRecursively(counts.get(i)));
    }
  }
}
