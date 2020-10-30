package com.robwilliamson.mailfamiliar.entity;

import lombok.Data;

import javax.persistence.*;

@Data
@Entity
@Table(name = "header_name")
public class HeaderName {
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Id
  private int id;
  private String name;
}
