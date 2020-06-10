package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.model.Imap;

import java.util.stream.Stream;

public interface AccountProvider {
  Stream<Imap> getAccounts();
}
