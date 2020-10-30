package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.authorization.AuthorizedUser;
import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.model.Id;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

public interface UserAccountIdentifier {
  Optional<Id<User>> ownerOf(Id<Imap> id);

  default void assertOwnership(AuthorizedUser principal, Id<Imap> id) {
    Optional<Id<User>> userIdOptional = ownerOf(id);
    if (userIdOptional.isEmpty() || userIdOptional.get().getValue() != principal.user().getId()) {
      throw new AccessDeniedException("This user cannot access the IMAP account with ID "
          + id.getValue());
    }
  }
}
