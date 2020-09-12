package com.robwilliamson.mailfamiliar.service.predictor.model;

import lombok.Data;

import javax.annotation.Nullable;

@Data
class MatchGap {
  @Nullable
  private String precedingMatch;
  @Nullable
  private String succeedingMatch;
  private int firstCharPosition;
  @Nullable
  private String content;

  void populateContentFrom(String source) {
    if (precedingMatch == null && succeedingMatch == null) {
      content = source;
      return;
    }

    if (succeedingMatch != null) {
      content = source.substring(firstCharPosition, source.indexOf(succeedingMatch));
      return;
    }

    content = source.substring(firstCharPosition);
  }
}
