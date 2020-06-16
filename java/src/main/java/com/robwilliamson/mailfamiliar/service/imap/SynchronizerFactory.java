package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.entity.Imap;

public interface SynchronizerFactory {
  Synchronizer create(Imap imap);
}
