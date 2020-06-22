package com.robwilliamson.mailfamiliar.service.imap;

import com.robwilliamson.mailfamiliar.entity.*;
import com.robwilliamson.mailfamiliar.model.Id;
import org.springframework.lang.Nullable;

import javax.mail.*;
import java.util.*;

import static javax.mail.Folder.HOLDS_MESSAGES;

public class FolderMethods {
  private static final Set<String> DRAFTS = Set.of("drafts");
  private static final Set<String> INBOX = Set.of("inbox");
  private static final Set<String> SENT = Set.of("sent", "sent items");
  private static final Set<String> SPAM = Set.of("spam", "junk");
  private static final Set<String> TRASH = Set.of("trash", "recycle", "deleted items");

  private FolderMethods() {
  }

  public static Mailbox createMailbox(Folder folder, Id<Imap> imapAccountId)
      throws MessagingException {
    final var result = new Mailbox();
    result.setImapAccountId(imapAccountId.getValue());
    result.setName(fullyQualifiedName(folder));
    return result;
  }

  public static String fullyQualifiedName(Folder folder) throws MessagingException {
    if (folder == null) {
      return "";
    }

    final var base = fullyQualifiedName(folder.getParent());

    return base.isBlank() ? folder.getName() : base + folder.getSeparator() + folder.getName();
  }

  public static boolean holdsMessages(Folder folder) throws MessagingException {
    return (folder.getType() & HOLDS_MESSAGES) != 0;
  }

  public static boolean isMovable(Folder folder) throws MessagingException {
    return holdsMessages(folder) && isAny(folder, INBOX);
  }

  public static boolean isStorable(Folder folder) throws MessagingException {
    return holdsMessages(folder) && !isAny(folder, TRASH, SENT, DRAFTS);
  }

  @SafeVarargs
  private static boolean isAny(Folder folder, Set<String>... names) throws MessagingException {
    return List.of(names)
        .stream()
        .anyMatch(nameSet -> nameSet.contains(folder.getName().toLowerCase()))
        && isFirstLevel(folder);
  }

  private static boolean isFirstLevel(Folder folder) throws MessagingException {
    return isRoot(folder.getParent());
  }

  private static boolean isRoot(@Nullable Folder folder) throws MessagingException {
    return folder != null && folder.getParent() == null;
  }
}
