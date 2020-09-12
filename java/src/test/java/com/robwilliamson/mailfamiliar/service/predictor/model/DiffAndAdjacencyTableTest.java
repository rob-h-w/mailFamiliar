package com.robwilliamson.mailfamiliar.service.predictor.model;

import org.junit.jupiter.api.*;

import java.util.*;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class DiffAndAdjacencyTableTest {
  private DiffAndAdjacencyTable subject;
  private List<String> suppliedStrings;

  @BeforeEach
  void setUp() {
    suppliedStrings = List.of();
    subject = new DiffAndAdjacencyTable(() -> suppliedStrings.stream());
  }

  @Test
  void stringProbabilityZero() {
    assertEquals(0, subject.probabilityOf("anything"), 0);
  }

  @Test
  void entropyIsCorrect() {
    assertEquals(0, subject.entropyBits(), 0);
  }

  @Test
  void sizeIsCorrect() {
    assertEquals(0, subject.getSize());
  }

  @Test
  void meanLengthIsCorrect() {
    assertEquals(0, subject.getMeanLength(), 0);
  }

  @Nested
  class WhenOneStringAdded {
    private final String SNOOT = "snooty snoot snoot";

    @BeforeEach
    void setUp() {
      subject.add(SNOOT);
    }

    @Test
    void snootProbability1() {
      assertEquals(1, subject.probabilityOf(SNOOT), 0);
    }

    @Test
    void entropyIsCorrect() {
      assertEquals(0, subject.entropyBits(), 0);
    }

    @Test
    void sizeIsCorrect() {
      assertEquals(1, subject.getSize());
    }

    @Test
    void meanLengthIsCorrect() {
      assertEquals(18, subject.getMeanLength(), 0);
    }

    @Nested
    class ThenTheSameAgain {

      @BeforeEach
      void setUp() {
        subject.add(SNOOT);
      }

      @Test
      void snootProbability1() {
        assertEquals(1, subject.probabilityOf(SNOOT), 0);
      }

      @Test
      void sizeIsCorrect() {
        assertEquals(2, subject.getSize());
      }

      @Test
      void meanLengthIsCorrect() {
        assertEquals(18, subject.getMeanLength(), 0);
      }

      @Nested
      class ThenSimilar {
        private final String SIMILAR = "snoot snoot snt";

        @BeforeEach
        void setUp() {
          subject.add(SIMILAR);
        }

        @Test
        void snootProbabilityLessThan1() {
          assertEquals(1, subject.probabilityOf(SNOOT), 0.1);
        }

        @Test
        void meanLengthIsCorrect() {
          assertEquals(17.0, subject.getMeanLength(), 0.1);
        }
      }
    }

    @Nested
    class Diff {
      @Test
      void empty() {
        assertEquals(List.of(), DiffAndAdjacencyTable.diff("", ""));
      }

      @Test
      void unequal() {
        assertEquals(List.of(Optional.empty()), DiffAndAdjacencyTable.diff("a", "b"));
      }

      @Test
      void equal() {
        assertEquals(
            List.of(Optional.of("a")),
            DiffAndAdjacencyTable.diff("a", "a"));
      }

      @Test
      void partlyEqual() {
        assertEquals(List.of(
            Optional.empty(),
            Optional.of("bb"),
            Optional.empty()
        ), DiffAndAdjacencyTable.diff("Abba", "ebbing"));
      }

      @Test
      void complexPartlyEqual() {
        assertEquals(
            List.of(
                Optional.of("This "),
                Optional.empty(),
                Optional.of("m"),
                Optional.empty(),
                Optional.of("a"),
                Optional.empty(),
                Optional.of("e "),
                Optional.empty(),
                Optional.of("is absurd.")
            ),
            DiffAndAdjacencyTable.diff(
                "This message is absurd.",
                "This communication of the data is absurd."));
      }
    }
  }
}
