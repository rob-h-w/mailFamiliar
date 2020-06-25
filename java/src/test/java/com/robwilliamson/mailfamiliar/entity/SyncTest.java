package com.robwilliamson.mailfamiliar.entity;

import org.junit.jupiter.api.*;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class SyncTest {
  Sync subject;

  @BeforeEach
  void setUp() {
    subject = new Sync();
  }

  @Nested
  class LastSynced {
    LocalDateTime localDateTime;

    @BeforeEach
    void setUp() {
      localDateTime = LocalDateTime.now();
    }

    @Test
    void restoresProperly() {
      subject.setLastSynced(localDateTime);
      assertEquals(localDateTime, subject.lastSynced());
    }

    @Test
    void savesProperly() {
      subject.setLastSynced(localDateTime);
      final String lastSynced = subject.getLastSynced();
      assertTrue(lastSynced.contains(" "));
    }
  }
}
