package com.robwilliamson.mailfamiliar.service.predictor.model;

import com.robwilliamson.mailfamiliar.exceptions.StringAbsentException;
import org.assertj.core.data.Percentage;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.doReturn;

@ExtendWith(MockitoExtension.class)
class NgramTest {
  Ngram ngram;

  @Mock
  StringStore stringStore;

  @Nested
  class Bigram {
    @BeforeEach
    public void setUp() {
      ngram = new Ngram(2, stringStore);
    }

    @Test
    void remove_absentString_throws() {
      assertThrows(StringAbsentException.class, () -> ngram.remove("not there"));
    }

    @Test
    void add_DoesNotThrow() {
      assertDoesNotThrow(() -> ngram.add("a thing"));
    }

    @Test
    void charAdd_resultsIn2Segments() {
      ngram.add("a");
      assertThat(ngram.getCount()).isEqualTo(Map.of(
          "sta", 1,
          "aend", 1
      ));
      assertThat(ngram.getTotal()).isEqualTo(1L);
    }

    @Test
    void multiCharAdd_resultsInCorrectSegments() {
      ngram.add("abc");
      assertThat(ngram.getCount()).isEqualTo(Map.of(
          "sta", 1,
          "ab", 1,
          "bc", 1,
          "cend", 1
      ));
      assertThat(ngram.getTotal()).isEqualTo(3L);
    }

    @Test
    void probabilityOf_works() {
      assertThat(ngram.probabilityOf("anything")).isEqualTo(0);

      ngram.add("abc");
      assertThat(ngram.probabilityOf("abc")).isEqualTo(1);
      ngram.add("abc");
      assertThat(ngram.probabilityOf("abc")).isEqualTo(1);
      ngram.add("ab");
      assertThat(ngram.probabilityOf("abc")).isCloseTo(1.0, Percentage.withPercentage(10));
    }
  }

  @Nested
  class Trigram {
    @BeforeEach
    public void setUp() {
      ngram = new Ngram(3, stringStore);
    }

    @Test
    void endAdd_resultsInCorrectSegments() {
      ngram.add("end");
      assertThat(ngram.getCount()).isEqualTo(Map.of(
          "stste", 1,
          "sten", 1,
          "end", 1,
          "ndend", 1,
          "dendend", 1
      ));
    }

    @Test
    void startAdd_resultsInCorrectSegments() {
      ngram.add("ast");
      assertThat(ngram.getCount()).isEqualTo(Map.of(
          "ststa", 1,
          "stas", 1,
          "ast", 1,
          "stend", 1,
          "tendend", 1
      ));
    }

    @Test
    void multipleAdd_worksCorrectly() {
      ngram.add("abc");
      ngram.add("abc");
      ngram.add("abcd");
      assertThat(ngram.getTotal()).isEqualTo(10L);
      assertThat(ngram.getCount()).isEqualTo(Map.of(
          "ststa", 3,
          "stab", 3,
          "abc", 3,
          "bcend", 2,
          "bcd", 1,
          "cendend", 2,
          "cdend", 1,
          "dendend", 1
      ));
      assertThat(ngram.getLeadingTotals()).isEqualTo(Map.of(
          "stst", 3,
          "sta", 3,
          "ab", 3,
          "bc", 3,
          "cend", 2,
          "cd", 1,
          "dend", 1
      ));
      assertThat(ngram.getGramByLeading()).isEqualTo(Map.of(
          "stst", Set.of("ststa"),
          "sta", Set.of("stab"),
          "ab", Set.of("abc"),
          "bc", Set.of("bcd", "bcend"),
          "cend", Set.of("cendend"),
          "cd", Set.of("cdend"),
          "dend", Set.of("dendend")
      ));
    }

    @Test
    void remove_worksCorrectly() throws StringAbsentException {
      ngram.add("abc");
      ngram.add("a");
      doReturn(true).when(stringStore).stringExists("abc");
      ngram.remove("abc");

      assertThat(ngram.getTotal()).isEqualTo(1L);
      assertThat(ngram.getCount()).isEqualTo(Map.of(
          "ststa", 1,
          "staend", 1,
          "aendend", 1
      ));
    }

    @Nested
    class ConvolutionOf {
      private List<String> of(String string) {
        return ngram.convolutionOf(string).collect(Collectors.toList());
      }

      @Test
      void handlesShortStrings() {
        assertThat(of("a")).isEqualTo(List.of("a", "a", "a"));
        assertThat(of("ab")).isEqualTo(List.of("a", "ab", "ab", "b"));
        assertThat(of("abc")).isEqualTo(List.of("a", "ab", "abc", "bc", "c"));
      }

      @Test
      void handlesLongerStrings() {
        assertThat(of("abcd")).isEqualTo(List.of("a", "ab", "abc", "bcd", "cd", "d"));
      }
    }

    @Nested
    class PaddedConvolutionOf {
      private List<String> of(String string) {
        return ngram.paddedConvolutionOf(string).collect(Collectors.toList());
      }

      @Test
      void handlesShortStrings() {
        assertThat(of("a")).isEqualTo(List.of("ststa", "staend", "aendend"));
        assertThat(of("ab")).isEqualTo(List.of("ststa", "stab", "abend", "bendend"));
        assertThat(of("abc")).isEqualTo(List.of("ststa", "stab", "abc", "bcend", "cendend"));
      }

      @Test
      void handlesLongerStrings() {
        assertThat(of("abcd")).isEqualTo(List.of("ststa", "stab", "abc", "bcd", "cdend", "dendend"));
      }
    }

    @Nested
    class FixAwareSubstring {
      @Test
      void handlesMidString() {
        assertThat(ngram.padAwareSubstring("abc", 1, 3)).isEqualTo("bc");
        assertThat(ngram.padAwareSubstring("abc", 0, 3)).isEqualTo("abc");
        assertThat(ngram.padAwareSubstring("abc", 0, 1)).isEqualTo("a");
        assertThat(ngram.padAwareSubstring("abc", 2, 3)).isEqualTo("c");
      }

      @Test
      void handlesPrefixes() {
        assertThat(ngram.padAwareSubstring("stab", 1, 3)).isEqualTo("ab");
        assertThat(ngram.padAwareSubstring("stab", 0, 3)).isEqualTo("stab");
        assertThat(ngram.padAwareSubstring("stab", 0, 1)).isEqualTo("st");
        assertThat(ngram.padAwareSubstring("stab", 2, 3)).isEqualTo("b");
      }

      @Test
      void handlesSuffixes() {
        assertThat(ngram.padAwareSubstring("abend", 1, 3)).isEqualTo("bend");
        assertThat(ngram.padAwareSubstring("abend", 0, 3)).isEqualTo("abend");
        assertThat(ngram.padAwareSubstring("abend", 0, 1)).isEqualTo("a");
        assertThat(ngram.padAwareSubstring("abend", 2, 3)).isEqualTo("end");
        assertThat(ngram.padAwareSubstring("aendend", 1, 3)).isEqualTo("endend");
        assertThat(ngram.padAwareSubstring("aendend", 2, 3)).isEqualTo("end");
      }

      @Test
      void distinguishesPrefixesAndSuffixes() {
        assertThat(ngram.padAwareSubstring("stend", 1, 3)).isEqualTo("tend");
      }

      @Test
      void throwsBadArguments() {
        assertThrows(IllegalArgumentException.class, () -> ngram.padAwareSubstring("abcd", 0, 1));
      }
    }
  }
}