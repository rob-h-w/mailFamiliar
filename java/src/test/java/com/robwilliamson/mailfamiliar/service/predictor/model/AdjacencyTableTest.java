package com.robwilliamson.mailfamiliar.service.predictor.model;

import com.robwilliamson.mailfamiliar.exceptions.StringAbsentException;
import org.junit.jupiter.api.*;

import static org.junit.jupiter.api.Assertions.*;

class AdjacencyTableTest {
  private static final double DELTA = 0.01;
  private AdjacencyTable subject;

  @BeforeEach
  void setUp() {
    subject = new AdjacencyTable();
  }

  @Nested
  class Empty {
    @Test
    void counts_return0() {
      assertEquals(0, subject.countFor("anything"));
      assertEquals(0, subject.countFor('a', 'b'));
      assertEquals(0, subject.countFor('a'));
      assertEquals(0, subject.startCount());
      assertEquals(0, subject.endCount());
    }

    @Test
    void probabilityOf_returns0() {
      assertEquals(0.0, subject.probabilityOf("anything"), DELTA);
    }

    @Test
    void getTotal_returns0() {
      assertEquals(0L, subject.getTotal());
    }

    @Test
    void addEmpty_resultsIn0Total() {
      subject.add("");

      assertEquals(0L, subject.getTotal());
    }

    @Test
    void addNull_resultsIn0Total() {
      subject.add(null);

      assertEquals(0L, subject.getTotal());
    }

    @Test
    void entropy_returns0() {
      assertEquals(0, subject.entropyBits(), 0);
    }
  }

  @Nested
  class Add {
    @Nested
    class SingleCharacter {
      @BeforeEach
      void setUp() {
        subject.add("a");
      }

      @Test
      void counts_return1() {
        assertEquals(1, subject.countFor(AdjacencyTable.START + "a"));
        assertEquals(1, subject.countFor('a'));
        assertEquals(1, subject.startCount());
        assertEquals(1, subject.endCount());
        assertEquals(1, subject.countFor("a" + AdjacencyTable.END));
      }

      @Test
      void probabilityOf_returns1() {
        assertEquals(1.0, subject.probabilityOf("a"), DELTA);
      }

      @Test
      void otherCountsAreZero() {
        assertEquals(0, subject.countFor('a', 'b'));
        assertEquals(0, subject.countFor('x'));
      }

      @Test
      void getTotal_returns2() {
        assertEquals(2L, subject.getTotal());
      }

      @Test
      void entropy_returns0() {
        assertEquals(0, subject.entropyBits(), 0);
      }

      @Nested
      class ThenNextCharacter {
        @BeforeEach
        void setUp() {
          subject.add("b");
        }

        @Test
        void entropy_isCorrect() {
          assertEquals(1, subject.entropyBits(), 0);
        }
      }

      @Nested
      class ThenMultipleCharacters {
        @BeforeEach
        void setUp() {
          subject.add("abcöd");
        }

        @Test
        void counts_areCorrect() {
          assertEquals(2, subject.countFor(AdjacencyTable.START + "a"));
          assertEquals(2, subject.countFor('a'));
          assertEquals(1, subject.countFor('b'));
          assertEquals(2, subject.startCount());
          assertEquals(2, subject.endCount());
          assertEquals(1, subject.countFor('b', 'c'));
          assertEquals(1, subject.countFor("a" + AdjacencyTable.END));
          assertEquals(1, subject.countFor("d" + AdjacencyTable.END));
        }

        @Test
        void probabilityOf_isCorrect() {
          assertEquals(0.75, subject.probabilityOf("a"), DELTA);
          assert (subject.probabilityOf("abcöd") > 0.9);
        }

        @Test
        void otherCountsAreZero() {
          assertEquals(0, subject.countFor('a', 'c'));
        }

        @Test
        void getTotal_returns8() {
          assertEquals(8L, subject.getTotal());
        }

        @Test
        void entropy_isCorrect() {
          assertEquals(1, subject.entropyBits(), 0);
        }

        @Nested
        class ThenRemove {
          @BeforeEach
          void setUp() throws StringAbsentException {
            subject.remove("a");
          }

          @Test
          void counts_areCorrect() {
            assertEquals(1, subject.countFor(AdjacencyTable.START + "a"));
            assertEquals(1, subject.countFor('a'));
            assertEquals(1, subject.countFor('b'));
            assertEquals(1, subject.startCount());
            assertEquals(1, subject.endCount());
            assertEquals(1, subject.countFor('b', 'c'));
            assertEquals(1, subject.countFor("d" + AdjacencyTable.END));
          }

          @Test
          void probabilityOf_isCorrect() {
            assertEquals(0.5, subject.probabilityOf("a"), DELTA);
          }

          @Test
          void getTotal_returns6() {
            assertEquals(6L, subject.getTotal());
          }

          @Test
          void strictRemoveOfAbsent_throws() {
            assertThrows(
                StringAbsentException.class,
                () -> subject.remove("bcd"));
          }

          @Test
          void entropy_isCorrect() {
            assertEquals(0, subject.entropyBits(), 0);
          }
        }
      }
    }
  }

}