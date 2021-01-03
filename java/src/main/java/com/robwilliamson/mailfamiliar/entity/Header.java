package com.robwilliamson.mailfamiliar.entity;

import lombok.*;
import org.apache.commons.lang.builder.HashCodeBuilder;

import javax.persistence.*;
import java.util.*;

import static com.robwilliamson.mailfamiliar.Equals.doEquals;

@AllArgsConstructor
@Builder
@Entity
@Getter
@NoArgsConstructor
@Setter
@Table(name = "header")
@ToString
public class Header {
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;
  private int messageId;
  @ManyToOne(optional = false)
  private HeaderName headerName;
  private String value;

  public static Set<Header> from(Map<String, List<String>> headers) {
    return null;
  }

  @Override
  public boolean equals(Object obj) {
    return doEquals(
        Header.class,
        this,
        obj,
        (builder, right) -> builder
            .append(getMessageId(), right.getMessageId())
            .append(getHeaderName(), right.getHeaderName()));
  }

  @Override
  public int hashCode() {
    return new HashCodeBuilder()
        .append(getMessageId())
        .append(getHeaderName())
        .hashCode();
  }
}
