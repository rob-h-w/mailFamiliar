package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.entity.Imap;

import java.util.function.Function;

public interface SynchronizerFactory extends Function<Imap, Synchronizer> {
}
