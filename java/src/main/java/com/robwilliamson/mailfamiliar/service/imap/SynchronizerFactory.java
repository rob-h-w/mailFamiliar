package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.model.Imap;

import java.util.function.Function;

public interface SynchronizerFactory extends Function<Imap, Synchronizer> {
}
