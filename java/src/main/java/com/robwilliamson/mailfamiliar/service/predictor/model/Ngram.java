package com.robwilliamson.mailfamiliar.service.predictor.model;

import com.robwilliamson.mailfamiliar.exceptions.StringAbsentException;
import lombok.*;

import java.util.*;
import java.util.function.BiFunction;
import java.util.stream.*;

import static org.springframework.data.util.StreamUtils.zip;

@AllArgsConstructor
@Builder
@Getter(AccessLevel.PACKAGE)
@RequiredArgsConstructor
public class Ngram implements
    StringAnalyzer,
    StringProbability {
  public static final String END = "end";
  public static final String START = "st";
  private static final BiFunction<String, Integer, Integer> ADD =
      (String key, Integer count) -> count == null ? 1 : ++count;
  private static final BiFunction<String, Integer, Integer> REMOVE =
      (String key, Integer count) -> count == null ? 0 : --count;

  @Getter(AccessLevel.NONE)
  private final int n;
  @Getter(AccessLevel.NONE)
  private final StringStore stringStore;

  long total;
  Map<String, Integer> count = new HashMap<>();
  Map<String, Integer> leadingTotals = new HashMap<>();
  Map<String, HashSet<String>> gramByLeading = new HashMap<>();

  private static String makePad(int length) {
    final String pad = length < 0 ? START : END;
    return IntStream
        .range(0, Math.abs(length))
        .mapToObj(i -> pad)
        .collect(Collectors.joining());
  }

  public static Ngram from(
      com.robwilliamson.mailfamiliar.entity.Ngram ngram,
      StringStore stringStore) {
    final NgramBuilder builder = Ngram.builder();
    builder.n(ngram.getN());
    builder.stringStore(stringStore);
    builder.total(ngram.getTotal());
    final Ngram ngramModel = builder.build();
    ngram.getCounts()
        .forEach(ngramCount -> {
          final String gram = ngramCount.getValue().getValue();
          final String leading = ngramModel.leadingGram(gram);
          final int count = ngramCount.getCount();
          final int leadingCount = count
              + ngramModel.leadingTotals.getOrDefault(leading, 0);
          ngramModel.addGram(gram);
          ngramModel.leadingTotals.put(leading, leadingCount);
          ngramModel.count.put(gram, count);
        });
    return ngramModel;
  }

  @Override
  public void add(String string) {
    paddedConvolutionOf(string)
        .forEach(this::addGram);
    total += string.length();
  }

  private void addGram(String gram) {
    count.compute(gram, ADD);

    final String leading = leadingGram(gram);
    leadingTotals.compute(leading, ADD);
    gramByLeading.compute(leading, (String key, HashSet<String> set) -> {
      if (set == null) {
        return new HashSet<>(List.of(gram));
      }

      set.add(gram);
      return set;
    });
  }

  private String leadingGram(String gram) {
    return padAwareSubstring(gram, 0, n - 1);
  }

  String padAwareSubstring(String string, int startIndex, int endIndex) {
    if (string.length() == n) {
      return string.substring(startIndex, endIndex);
    }

    final boolean padIsStart = string.startsWith(START);
    final boolean padIsEnd = string.endsWith(END);

    if (!padIsEnd && !padIsStart) {
      throw new IllegalArgumentException(string + " must be either a start or end string.");
    }

    if (padIsEnd) {
      final int endCount = countEnds(string);
      final int endLength = endCount * END.length();
      final int nonEndCharacterStringLength = string.length() - endLength;

      if (nonEndCharacterStringLength > endIndex) {
        return string.substring(startIndex, endIndex);
      }

      if (startIndex > nonEndCharacterStringLength) {
        return IntStream.range(0, endIndex - startIndex)
            .mapToObj(i -> END)
            .collect(Collectors.joining());
      }

      return string.substring(startIndex, nonEndCharacterStringLength)
          + IntStream.range(0, endIndex - nonEndCharacterStringLength)
          .mapToObj(i -> END)
          .collect(Collectors.joining());
    }

    final int startCount = countStarts(string);
    if (endIndex <= startCount) {
      return IntStream.range(0, endIndex - startIndex)
          .mapToObj(i -> START)
          .collect(Collectors.joining());
    }

    final int startLength = startCount * START.length();
    final int startDiff = startLength - startCount;
    if (startCount <= startIndex) {
      return string.substring(startLength + startIndex - startCount, endIndex + startDiff);
    }

    return IntStream.range(0, startCount - startIndex)
        .mapToObj(i -> START)
        .collect(Collectors.joining())
        + string.substring(startLength, endIndex + startDiff);
  }

  private int countStarts(String string) {
    if (string.length() < n) {
      return 0;
    }

    return string.startsWith(START)
        ? 1 + countStarts(string.substring(START.length()))
        : 0;
  }

  private int countEnds(String string) {
    if (string.length() < n) {
      return 0;
    }

    return string.endsWith(END)
        ? 1 + countEnds(string.substring(0, string.length() - END.length()))
        : 0;
  }

  Stream<String> paddedConvolutionOf(String string) {
    final int length = string.length();
    return zip(
        convolutionOf(string),
        IntStream
            .range(1 - n, length)
            .map(i -> {
              if (i < 0) {
                return i;
              }

              if (i < length - n) {
                return 0;
              }

              return i - length + n;
            })
            .boxed(),
        (String gram, Integer padCount) -> {
          if (padCount == 0) {
            return gram;
          }

          if (padCount < 0) {
            String result = makePad(padCount) + gram;
            final int starts = countStarts(result);
            final int remainder = result.length() - START.length() * starts;
            final int resultLength = starts + remainder;

            if (resultLength < n) {
              result += makePad(n - resultLength);
            }

            return result;
          }

          return gram + makePad(padCount);
        });
  }

  Stream<String> convolutionOf(String string) {
    final int length = string.length();
    return IntStream
        .range(1 - n, length)
        .mapToObj(i -> {
          int start = Math.max(i, 0);
          int end = Math.min(i + n, string.length());
          return string.substring(start, end);
        });
  }

  @Override
  public void remove(String string) throws StringAbsentException {
    if (!stringStore.stringExists(string)) {
      throw new StringAbsentException();
    }

    paddedConvolutionOf(string)
        .forEach(this::removeGram);
    total -= string.length();
  }

  private void removeGram(String gram) {
    count.compute(gram, REMOVE);

    final String leading = padAwareSubstring(gram, 0, n - 1);
    leadingTotals.compute(leading, REMOVE);
    gramByLeading.compute(leading, (String key, HashSet<String> set) -> {
      if (set == null) {
        return new HashSet<>();
      }

      if (count.getOrDefault(gram, 0) == 0) {
        set.remove(gram);
        count.remove(gram);
      }

      return set;
    });
  }

  @Override
  public double probabilityOf(String string) {
    return paddedConvolutionOf(string)
        .mapToDouble(gram -> {
          final int leadingTotal = leadingTotals.getOrDefault(padAwareSubstring(gram, 0, n - 1), 1);

          if (leadingTotal == 0) {
            return 0;
          }

          return ((double) count.getOrDefault(gram, 0))
              / leadingTotal;
        })
        .average()
        .orElse(0);
  }
}

