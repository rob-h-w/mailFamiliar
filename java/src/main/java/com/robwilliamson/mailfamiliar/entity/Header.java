package com.robwilliamson.mailfamiliar.entity;

import lombok.Data;

import javax.persistence.*;

@Data
@Entity
@Table(name = "header")
public class Header {
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;
  private int messageId;
  private int headerNameId;
  private String value;
}
