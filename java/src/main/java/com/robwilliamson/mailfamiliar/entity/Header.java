package com.robwilliamson.mailfamiliar.entity;

import lombok.Data;

import javax.persistence.*;
import java.util.*;

@Data
@Entity
@Table(name = "header")
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
}
