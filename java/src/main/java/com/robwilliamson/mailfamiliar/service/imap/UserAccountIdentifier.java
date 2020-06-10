package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.model.*;

import java.util.Optional;

public interface UserAccountIdentifier {
  Optional<Id<User>> ownerOf(Id<Imap> id);
}
