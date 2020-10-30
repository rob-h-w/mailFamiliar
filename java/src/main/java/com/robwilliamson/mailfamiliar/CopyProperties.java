package com.robwilliamson.mailfamiliar;

import org.springframework.beans.BeanUtils;

public class CopyProperties {
  private CopyProperties() {
  }

  public static <T, U> U copy(T from, U to) {
    BeanUtils.copyProperties(from, to);
    return to;
  }
}
