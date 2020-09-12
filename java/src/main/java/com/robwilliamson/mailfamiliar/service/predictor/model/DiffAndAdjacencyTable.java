package com.robwilliamson.mailfamiliar.service.predictor.model;

import com.robwilliamson.mailfamiliar.exceptions.StringAbsentException;
import difflib.*;
import org.apache.commons.lang3.NotImplementedException;

import java.util.*;
import java.util.function.Supplier;
import java.util.stream.*;

public class DiffAndAdjacencyTable implements EntropyMeasured, StringAnalyzer, StringProbability {
  private final List<AdjacencyTable> otherTables = new ArrayList<>();
  private final Supplier<Stream<String>> stringSupplier;
  private List<Optional<String>> diff = new ArrayList<>();
  private Optional<String> diffAsString = Optional.empty();
  private Optional<AdjacencyTable> start = Optional.empty();
  private Optional<AdjacencyTable> end = Optional.empty();
  private int size;
  private double meanLength;

  public DiffAndAdjacencyTable(Supplier<Stream<String>> stringSupplier) {
    this.stringSupplier = stringSupplier;
  }

  static List<Optional<String>> diff(String original, String revised) {
    final Patch<String> newDiff = DiffUtils.diff(List.of(original.split("")),
        List.of(revised.split("")));
    final var result = new ArrayList<Optional<String>>();
    int lastEqualChunkEnd = 0;
    int lastUnequalChunkEnd = 0;
    boolean lastWasEmpty = false;
    for (final var stringDelta :
        newDiff.getDeltas()
            .stream()
            .sorted(Comparator.comparing(delta -> delta.getOriginal().getPosition()))
            .collect(Collectors.toList())) {
      final int nextEqualChunkEnd = stringDelta.getOriginal().getPosition();

      if (nextEqualChunkEnd == 0) {
        if (!lastWasEmpty) {
          result.add(Optional.empty());
          lastWasEmpty = true;
        }
      } else {
        var next = Optional.of(original.substring(lastUnequalChunkEnd, nextEqualChunkEnd));
        if (next.get().isEmpty()) {
          if (!lastWasEmpty) {
            result.add(Optional.empty());
            lastWasEmpty = true;
          }
        } else {
          result.add(next);
          lastWasEmpty = false;
        }
      }

      if (nextEqualChunkEnd < original.length() && !lastWasEmpty) {
        result.add(Optional.empty());
        lastWasEmpty = true;
      }

      lastEqualChunkEnd = nextEqualChunkEnd;
      lastUnequalChunkEnd = lastEqualChunkEnd + stringDelta.getOriginal().getLines().size();
    }

    if (lastUnequalChunkEnd < original.length()) {
      result.add(Optional.of(original.substring(lastUnequalChunkEnd)));
    }

    return result;
  }

  @Override
  public double entropyBits() {
    return (start.map(AdjacencyTable::entropyBits).orElse(0.0))
        + otherTables
        .stream()
        .mapToDouble(AdjacencyTable::entropyBits)
        .reduce(0, Double::sum)
        + (end.map(AdjacencyTable::entropyBits).orElse(0.0));
  }

  @Override
  public void add(String string) {
    if (string == null || string.isEmpty()) {
      return;
    }

    if (diff.isEmpty()) {
      diff.add(Optional.of(string));
    } else {
      diff = diff(getDiffAsString(), string);
    }

    meanLength = meanLength * size + string.length();
    size++;
    meanLength /= size;

    diffAsString = Optional.empty();
  }

  @Override
  public void remove(String string) throws StringAbsentException {
    if (string == null || string.isEmpty()) {
      return;
    }

    if (size == 0) {
      throw new StringAbsentException();
    }

    reset();
    // TODO: Implementation here.

    meanLength = meanLength * size - string.length();
    size--;
    meanLength = size == 0 ? 0 : meanLength / size;

    diffAsString = Optional.empty();
  }

  @Override
  public double probabilityOf(String string) {
    if (diff.isEmpty()) {
      return 0;
    }

    final Patch<String> patch = DiffUtils.diff(List.of(getDiffAsString()), List.of(string));
    if (patch.getDeltas().isEmpty()) {
      return 1;
    }

    final List<Optional<String>> candidateDiff = diff(getDiffAsString(), string);
    final int candidateDiffLength = candidateDiff
        .stream()
        .mapToInt(optional -> optional.isEmpty() ? 0 : optional.get().length())
        .sum();
    List<Optional<MatchGap>> optionalGaps = candidateDiff
        .stream()
        .map(gap -> Optional.ofNullable(gap.isEmpty() ? new MatchGap() : null))
        .collect(Collectors.toList());

    int charPosition = 0;
    for (int i = 0; i < candidateDiff.size(); i++) {
      final Optional<String> diffSegment = candidateDiff.get(i);
      if (diffSegment.isEmpty()) {
        assert optionalGaps.get(i).isPresent();
        final MatchGap matchGap = optionalGaps.get(i).get();
        if (i != 0) {
          final Optional<String> precedingMatch = candidateDiff.get(i - 1);
          assert precedingMatch.isPresent();
          matchGap.setPrecedingMatch(precedingMatch.get());
        }

        if (i + 1 < candidateDiff.size()) {
          final Optional<String> succeedingMatch = candidateDiff.get(i + 1);
          assert succeedingMatch.isPresent();
          matchGap.setSucceedingMatch(succeedingMatch.get());
        }

        matchGap.setFirstCharPosition(charPosition);
        matchGap.populateContentFrom(string);
        assert matchGap.getContent() != null;
        charPosition += matchGap.getContent().length();
      }
    }

    final List<MatchGap> gaps = optionalGaps
        .stream()
        .filter(Optional::isPresent)
        .map(Optional::get)
        .collect(Collectors.toList());

    double confidence = ((double) candidateDiffLength) / string.length();

    int minIndex = 0;
    List<AdjacencyTable> aTables = new ArrayList<>();
    List<String> gapContentToMatch = new ArrayList<>();
    for (final MatchGap gap : gaps) {
      int diffIndex = minIndex;

      while (diffIndex < diff.size()) {
        final Optional<String> nextDiff = diff.get(diffIndex);
        if (nextDiff.isEmpty()) {
          if (diffIndex == 0) {
            assert start.isPresent();
            aTables.add(start.get());
          } else {
            throw new NotImplementedException("TODO");
            if (diffIndex + 1 == diff.size() && end.isPresent()) {
              aTables.add(end.get());
            }

            final Optional<String> preceding = diff.get(diffIndex - 1);
            assert preceding.isPresent();
            if (Objects.equals(gap.getPrecedingMatch(), preceding.get())) {
              break;
            }

            aTables.add(otherTables.get(diffIndex - 1));
          }

          gapContentToMatch.add(gap.getContent());
        }
        diffIndex++;
      }

      confidence += confidenceFor(aTables, gapContentToMatch, string.length());
      aTables = new ArrayList<>();
      gapContentToMatch = new ArrayList<>();
      minIndex = diffIndex;
    }

    if (end.isPresent()) {
      aTables.add(end.get());
    }

    confidence += confidenceFor(aTables, gapContentToMatch, string.length());

    return confidence;
  }

  private double confidenceFor(
      List<AdjacencyTable> aTables,
      List<String> gapContentToMatch,
      int length) {
    if (length == 0) {
      return 0;
    }

    final int aTablesSize = aTables.size();
    final int gapContentToMatchSize = gapContentToMatch.size();

    double confidence = 0;
    for (int i = 0; i < Math.max(aTablesSize, gapContentToMatchSize); i++) {
      confidence += aTables.get(i * aTablesSize / gapContentToMatchSize)
          .probabilityOf(gapContentToMatch
              .get(i * gapContentToMatchSize / aTablesSize));
    }

    return confidence *
        ((double) gapContentToMatch.stream().mapToInt(String::length).sum()) / length;
  }

  public double getMeanLength() {
    return meanLength;
  }

  public int getSize() {
    return size;
  }

  private String getDiffAsString() {
    if (diffAsString.isEmpty()) {
      diffAsString = diff
          .stream()
          .filter(Optional::isPresent)
          .map(Optional::get)
          .reduce((current, next) -> current + next);
    }

    return diffAsString.orElse("");
  }

  private void reset() {
    diff.clear();
    otherTables.clear();
    diffAsString = Optional.empty();
    start = Optional.empty();
    end = Optional.empty();
    size = 0;
    meanLength = 0;
  }
}
