package com.robwilliamson.mailfamiliar.entity;

import org.junit.jupiter.api.*;

import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

class SyncTest {
  Sync subject;

  @BeforeEach
  void setUp() {
    subject = new Sync();
  }

  @Nested
  class LastSynced {
    Date date;

    @BeforeEach
    void setUp() {
      date = new Date();
    }

    @Test
    void restoresProperly() {
      subject.setLastSynced(date);
      assertEquals(date, subject.lastSynced());
    }

    @Test
    void savesProperly() {
      subject.setLastSynced(date);
      final String lastSynced = subject.getLastSynced();
      assertTrue(lastSynced.contains(" "));
    }
  }
}
