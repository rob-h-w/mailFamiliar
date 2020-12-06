package com.robwilliamson.test;

import org.springframework.context.event.EventListener;

public class EventReceiver {
  @EventListener
  public void onEvent(Object event) {
  }
}
