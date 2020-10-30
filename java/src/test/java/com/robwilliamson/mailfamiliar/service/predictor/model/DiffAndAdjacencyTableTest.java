package com.robwilliamson.mailfamiliar.service.predictor.model;

import org.junit.jupiter.api.*;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class DiffAndAdjacencyTableTest {
  private DiffAndAdjacencyTable subject;

  @BeforeEach
  void setUp() {
    subject = new DiffAndAdjacencyTable();
  }

  @Test
  void stringProbabilityZero() {
    assertEquals(0, subject.probabilityOf("anything"), 0);
  }
}
